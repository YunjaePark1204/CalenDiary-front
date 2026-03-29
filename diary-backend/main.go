package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url" // ⭐️ 인코딩용
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-resty/resty/v2"
)

// ⭐️ 서버 구동 전, 본인의 API 키와 토큰을 여기에 넣어주세요!
const (
	RiotAPIKey  = "RGAPI-288c3964-6b88-43f5-9c4c-6ca066c1f0df" // 라이엇 디벨로퍼 포털 발급 키
	GithubToken = "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" // 깃허브 Personal Access Token
)

type DailyStats struct {
	Github   GithubStat   `json:"github"`
	Valorant ValorantStat `json:"valorant"`
	LoL      LolStat      `json:"lol"`
	TFT      TftStat      `json:"tft"`
}

type GithubStat struct {
	Commits int `json:"commits"`
}

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

func main() {
	r := gin.Default()

	// CORS 에러 방지 설정
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Next()
	})

	r.GET("/api/stats", func(c *gin.Context) {
		githubID := c.Query("github")
		riotName := c.Query("riot_name")
		riotTag := c.Query("riot_tag")
		targetDate := c.Query("date") // ⭐️ 프론트엔드에서 보낸 날짜 파라미터 수신 (예: 2026-03-21)

		// 유효성 검사
		if githubID == "" || riotName == "" || riotTag == "" || targetDate == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "파라미터가 부족합니다."})
			return
		}

		client := resty.New()

		// 1. 깃허브 호출 (특정 날짜 전달) 및 발로란트 전적 호출
		githubStat := fetchGithubStatsForDate(client, githubID, targetDate) // 함수 이름 변경 및 파라미터 추가
		valStat := fetchValorantStats(client, riotName, riotTag)

		// 2. 롤, 롤체 전적 호출 (PUUID -> SummonerID -> Ranks 체이닝)
		lolStat, tftStat := LolStat{Tier: "Unranked"}, TftStat{Tier: "Unranked"}
		puuid := fetchPUUID(client, riotName, riotTag)
		
		if puuid != "" {
			summonerId := fetchSummonerID(client, puuid)
			if summonerId != "" {
				lolStat, tftStat = fetchRiotRanks(client, summonerId)
			}
		}

		// 최종 데이터 조합 및 리턴
		response := DailyStats{
			Github:   githubStat,
			Valorant: valStat,
			LoL:      lolStat,
			TFT:      tftStat,
		}

		c.JSON(http.StatusOK, response)
	})

	fmt.Println("🚀 다이어리 백엔드 서버가 8080 포트에서 실행 중입니다!")
	r.Run(":8080")
}

// --- 헬퍼 함수들 ---

// 1. ⭐️ 깃허브 특정 날짜 커밋 수 가져오기 (수정됨)
func fetchGithubStatsForDate(client *resty.Client, githubID string, targetDate string) GithubStat {
	// GitHub Search API 날짜 쿼리 형식: committer-date:YYYY-MM-DD
	urlStr := fmt.Sprintf("https://api.github.com/search/commits?q=author:%s+committer-date:%s", githubID, targetDate)

	resp, err := client.R().
		SetHeader("Authorization", "token "+GithubToken).
		Get(urlStr)

	if err != nil {
		log.Println("GitHub API Error:", err)
		return GithubStat{Commits: 0}
	}

	var result map[string]interface{}
	json.Unmarshal(resp.Body(), &result)

	totalCount := 0
	if count, ok := result["total_count"].(float64); ok {
		totalCount = int(count)
	}

	return GithubStat{Commits: totalCount}
}

// 2. 발로란트 랭크 가져오기 (인코딩 버그 수정됨)
func fetchValorantStats(client *resty.Client, name string, tag string) ValorantStat {
	encodedName := url.PathEscape(name)
	encodedTag := url.PathEscape(tag)
	
	urlStr := fmt.Sprintf("https://api.henrikdev.xyz/valorant/v1/mmr/ap/%s/%s", encodedName, encodedTag)

	resp, err := client.R().Get(urlStr)
	if err != nil {
		return ValorantStat{Rank: "Unranked", RR: 0}
	}

	var result map[string]interface{}
	json.Unmarshal(resp.Body(), &result)

	data, ok := result["data"].(map[string]interface{})
	if !ok {
		return ValorantStat{Rank: "Unranked", RR: 0}
	}

	rank, _ := data["currenttierpatched"].(string)
	rrFloat, _ := data["ranking_in_tier"].(float64)

	return ValorantStat{Rank: rank, RR: int(rrFloat)}
}

// 3. 라이엇 PUUID 조회 (인코딩 버그 수정됨)
func fetchPUUID(client *resty.Client, name string, tag string) string {
	encodedName := url.PathEscape(name)
	encodedTag := url.PathEscape(tag)
	
	urlStr := fmt.Sprintf("https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/%s/%s", encodedName, encodedTag)
	
	resp, err := client.R().SetHeader("X-Riot-Token", RiotAPIKey).Get(urlStr)
	if err != nil {
		return ""
	}

	var result map[string]interface{}
	json.Unmarshal(resp.Body(), &result)

	if puuid, ok := result["puuid"].(string); ok {
		return puuid
	}
	return ""
}

// 4. 라이엇 Summoner ID 조회
func fetchSummonerID(client *resty.Client, puuid string) string {
	url := fmt.Sprintf("https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/%s", puuid)
	resp, err := client.R().SetHeader("X-Riot-Token", RiotAPIKey).Get(url)
	if err != nil {
		return ""
	}
	var result map[string]interface{}
	json.Unmarshal(resp.Body(), &result)
	if id, ok := result["id"].(string); ok {
		return id
	}
	return ""
}

// 5. 롤 & 롤체 랭크 정보 조회
func fetchRiotRanks(client *resty.Client, summonerId string) (LolStat, TftStat) {
	url := fmt.Sprintf("https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/%s", summonerId)
	resp, err := client.R().SetHeader("X-Riot-Token", RiotAPIKey).Get(url)
	var lol LolStat
	var tft TftStat
	if err != nil {
		return lol, tft
	}
	var data []map[string]interface{}
	json.Unmarshal(resp.Body(), &data)
	for _, queue := range data {
		queueType, _ := queue["queueType"].(string)
		tierStr, _ := queue["tier"].(string)
		rankStr, _ := queue["rank"].(string)
		tier := fmt.Sprintf("%s %s", tierStr, rankStr)
		lp, _ := queue["leaguePoints"].(float64)
		wins, _ := queue["wins"].(float64)
		losses, _ := queue["losses"].(float64)
		if queueType == "RANKED_SOLO_5x5" {
			lol = LolStat{Tier: tier, LP: int(lp), Wins: int(wins), Loss: int(losses)}
		} else if queueType == "RANKED_TFT" {
			tft = TftStat{Tier: tier, LP: int(lp), Wins: int(wins), Loss: int(losses)}
		}
	}
	return lol, tft
}