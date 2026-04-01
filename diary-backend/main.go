package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"

	"github.com/go-resty/resty/v2"
)

// 응답 데이터 구조체
type DailyStats struct {
	Github   GithubStat   `json:"github"`
	Valorant ValorantStat `json:"valorant"`
	LoL      LolStat      `json:"lol"`
	TFT      TftStat      `json:"tft"`
}
type GithubStat struct{ Commits int `json:"commits"` }
type ValorantStat struct {
	Rank string `json:"rank"`
	RR   int    `json:"rr"`
}
type LolStat struct {
	Tier string `json:"tier"`
	LP   int    `json:"lp"`
	Wins int    `json:"wins"`
	Loss int    `json:"loss"`
}
type TftStat struct {
	Tier string `json:"tier"`
	LP   int    `json:"lp"`
	Wins int    `json:"wins"`
	Loss int    `json:"loss"`
}

// ⭐️ Vercel 서버리스 진입점
func main() {
	http.HandleFunc("/api/stats", statsHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("🚀 Vercel 클라우드 서버리스 모드 작동 준비 완료! (Port:", port, ")")
	http.ListenAndServe(":"+port, nil)
}

func statsHandler(w http.ResponseWriter, r *http.Request) {
	// CORS 에러 방지
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	githubID := r.URL.Query().Get("github")
	riotName := r.URL.Query().Get("riot_name")
	riotTag := r.URL.Query().Get("riot_tag")
	targetDate := r.URL.Query().Get("date")

	fmt.Printf("\n--- 📡 [요청 수신] GitHub: %s, Riot: %s#%s, Date: %s ---\n", githubID, riotName, riotTag, targetDate)

	// Vercel 환경변수
	riotAPIKey := os.Getenv("RIOT_API_KEY")
	githubToken := os.Getenv("GITHUB_TOKEN")
	henrikAPIKey := os.Getenv("HENRIK_API_KEY")

	client := resty.New()

	githubStat := fetchGithubStatsForDate(client, githubID, targetDate, githubToken)
	valStat := fetchValorantStats(client, riotName, riotTag, henrikAPIKey)

	lolStat, tftStat := LolStat{Tier: "Unranked"}, TftStat{Tier: "Unranked"}
	puuid := fetchPUUID(client, riotName, riotTag, riotAPIKey)
	if puuid != "" {
		summonerId := fetchSummonerID(client, puuid, riotAPIKey)
		if summonerId != "" {
			lolStat, tftStat = fetchRiotRanks(client, summonerId, riotAPIKey)
		}
	}

	response := DailyStats{
		Github:   githubStat,
		Valorant: valStat,
		LoL:      lolStat,
		TFT:      tftStat,
	}

	json.NewEncoder(w).Encode(response)
}

// ⭐️ 깃허브 API 통신 및 완벽한 에러 로깅
func fetchGithubStatsForDate(client *resty.Client, githubID, targetDate, token string) GithubStat {
	query := fmt.Sprintf("author:%s committer-date:%s", githubID, targetDate)
	urlStr := fmt.Sprintf("https://api.github.com/search/commits?q=%s", url.QueryEscape(query))

	req := client.R().SetHeader("Accept", "application/vnd.github.v3+json")
	if token != "" {
		req.SetHeader("Authorization", "Bearer "+token)
	} else {
		fmt.Println("⚠️ [GitHub 경고] GITHUB_TOKEN이 Vercel 환경변수에 비어있습니다!")
	}
	
	resp, err := req.Get(urlStr)

	if err != nil {
		fmt.Println("❌ [GitHub 에러] API 통신 실패:", err)
		return GithubStat{Commits: 0}
	}
	
	if resp.StatusCode() != 200 {
		fmt.Printf("❌ [GitHub 에러] API 요청 거절됨 (상태코드: %d)\n사유: %s\n", resp.StatusCode(), string(resp.Body()))
		return GithubStat{Commits: 0}
	}

	var result map[string]interface{}
	json.Unmarshal(resp.Body(), &result)
	if count, ok := result["total_count"].(float64); ok {
		fmt.Printf("✅ [GitHub 성공] %s 커밋 수: %v개 가져옴!\n", targetDate, count)
		return GithubStat{Commits: int(count)}
	}
	return GithubStat{Commits: 0}
}

// ---------------- 헬퍼 함수들 ----------------

func fetchValorantStats(client *resty.Client, name, tag, apiKey string) ValorantStat {
	encodedName, encodedTag := url.PathEscape(name), url.PathEscape(tag)
	regions := []string{"kr", "ap"}

	for _, region := range regions {
		urlStr := fmt.Sprintf("https://api.henrikdev.xyz/valorant/v1/mmr/%s/%s/%s", region, encodedName, encodedTag)
		req := client.R()
		if apiKey != "" { req.SetHeader("Authorization", apiKey) }
		
		resp, err := req.Get(urlStr)
		if err == nil && resp.StatusCode() == 200 {
			var result map[string]interface{}
			json.Unmarshal(resp.Body(), &result)
			if data, ok := result["data"].(map[string]interface{}); ok {
				rank, _ := data["currenttierpatched"].(string)
				rrFloat, _ := data["ranking_in_tier"].(float64)
				fmt.Printf("✅ [Valorant 성공] %s#%s 전적 가져옴!\n", name, tag)
				return ValorantStat{Rank: rank, RR: int(rrFloat)}
			}
		} else if resp != nil {
			fmt.Printf("❌ [Valorant 에러] 조회 실패 (코드: %d) | 지역: %s\n", resp.StatusCode(), region)
		}
	}
	return ValorantStat{Rank: "Unranked", RR: 0}
}

func fetchPUUID(client *resty.Client, name, tag, riotKey string) string {
	if riotKey == "" {
		fmt.Println("⚠️ [Riot 경고] RIOT_API_KEY가 없습니다!")
		return ""
	}
	urlStr := fmt.Sprintf("https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/%s/%s", url.PathEscape(name), url.PathEscape(tag))
	resp, err := client.R().SetHeader("X-Riot-Token", riotKey).Get(urlStr)
	if err != nil || resp.StatusCode() != 200 {
		if resp != nil { fmt.Printf("❌ [Riot 에러] 계정 조회 실패 (코드: %d)\n사유: %s\n", resp.StatusCode(), string(resp.Body())) }
		return ""
	}
	var result map[string]interface{}
	json.Unmarshal(resp.Body(), &result)
	if puuid, ok := result["puuid"].(string); ok { return puuid }
	return ""
}

func fetchSummonerID(client *resty.Client, puuid, riotKey string) string {
	urlStr := fmt.Sprintf("https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/%s", puuid)
	resp, err := client.R().SetHeader("X-Riot-Token", riotKey).Get(urlStr)
	if err != nil || resp.StatusCode() != 200 { return "" }
	var result map[string]interface{}
	json.Unmarshal(resp.Body(), &result)
	if id, ok := result["id"].(string); ok { return id }
	return ""
}

func fetchRiotRanks(client *resty.Client, summonerId, riotKey string) (LolStat, TftStat) {
	urlStr := fmt.Sprintf("https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/%s", summonerId)
	resp, err := client.R().SetHeader("X-Riot-Token", riotKey).Get(urlStr)
	lol, tft := LolStat{Tier: "Unranked"}, TftStat{Tier: "Unranked"}
	if err != nil || resp.StatusCode() != 200 { return lol, tft }

	var data []map[string]interface{}
	json.Unmarshal(resp.Body(), &data)
	for _, queue := range data {
		qType, _ := queue["queueType"].(string)
		tier := fmt.Sprintf("%v %v", queue["tier"], queue["rank"])
		lp, _ := queue["leaguePoints"].(float64)
		wins, _ := queue["wins"].(float64)
		losses, _ := queue["losses"].(float64)
		
		if qType == "RANKED_SOLO_5x5" {
			lol = LolStat{Tier: tier, LP: int(lp), Wins: int(wins), Loss: int(losses)}
		} else if qType == "RANKED_TFT" {
			tft = TftStat{Tier: tier, LP: int(lp), Wins: int(wins), Loss: int(losses)}
		}
	}
	fmt.Println("✅ [LoL/TFT 성공] 롤 및 롤체 전적 가져옴!")
	return lol, tft
}