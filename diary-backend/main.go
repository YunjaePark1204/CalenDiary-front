package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// 1. 데이터 구조체(Struct) 정의 (MongoDB 스키마와 1:1 매칭)
type Todo struct {
	ID   int64  `json:"id" bson:"id"`
	Text string `json:"text" bson:"text"`
	Done bool   `json:"done" bson:"done"`
}

type DailyRecord struct {
	Date      string    `json:"date" bson:"date"` // 예: "2026-03-18"
	Diary     string    `json:"diary" bson:"diary"`
	Todos     []Todo    `json:"todos" bson:"todos"`
	UpdatedAt time.Time `json:"updatedAt" bson:"updatedAt"`
}

// 전역 DB 컬렉션 변수
var recordCollection *mongo.Collection

func main() {
	// 2. MongoDB 연결 설정 (추후 실제 Atlas URI로 변경 필요)
	clientOptions := options.Client().ApplyURI("mongodb://localhost:27017")
	client, err := mongo.Connect(context.TODO(), clientOptions)
	if err != nil {
		log.Fatal("MongoDB 연결 실패:", err)
	}
	defer client.Disconnect(context.TODO())

	fmt.Println("✅ MongoDB 연결 성공!")
	recordCollection = client.Database("diaryApp").Collection("daily_records")

	// 3. Gin 라우터 초기화
	r := gin.Default()

	// CORS 설정 (React Native 앱에서 접근할 수 있도록 허용)
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// 4. API 엔드포인트 설정
	
	// GET: 특정 월의 데이터 모두 가져오기 (예: /api/records?month=2026-03)
	r.GET("/api/records", getRecords)

	// POST: 특정 날짜의 데이터 저장/수정하기 (Upsert)
	r.POST("/api/records", saveRecord)

	// 5. 서버 실행 (8080 포트)
	fmt.Println("🚀 백엔드 서버가 8080 포트에서 실행 중입니다...")
	r.Run(":8080")
}

// --- 핸들러 함수들 ---

func getRecords(c *gin.Context) {
	month := c.Query("month") // "2026-03"
	if month == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "month 파라미터가 필요합니다."})
		return
	}

	// 정규식을 사용해 해당 월로 시작하는 모든 date 검색
	filter := bson.M{"date": bson.M{"$regex": "^" + month}}
	cursor, err := recordCollection.Find(context.TODO(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "데이터를 불러오는 데 실패했습니다."})
		return
	}
	defer cursor.Close(context.TODO())

	var records []DailyRecord
	if err = cursor.All(context.TODO(), &records); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "데이터 파싱 에러"})
		return
	}

	c.JSON(http.StatusOK, records)
}

func saveRecord(c *gin.Context) {
	var req DailyRecord
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "잘못된 요청 데이터입니다."})
		return
	}
	req.UpdatedAt = time.Now()

	// date 기준으로 찾아서 있으면 덮어쓰고(Update), 없으면 새로 생성(Insert)하는 Upsert 로직
	filter := bson.M{"date": req.Date}
	update := bson.M{"$set": req}
	opts := options.Update().SetUpsert(true)

	_, err := recordCollection.UpdateOne(context.TODO(), filter, update, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "데이터 저장 실패"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "성공적으로 저장되었습니다."})
}