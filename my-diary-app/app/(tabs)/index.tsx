import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Modal, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Lunar } from 'lunar-javascript';

const { width } = Dimensions.get('window');

// 1. 공휴일 데이터
const SOLAR_HOLIDAYS = { '01-01': '신정', '03-01': '3·1절', '05-05': '어린이날', '06-06': '현충일', '08-15': '광복절', '10-03': '개천절', '10-09': '한글날', '12-25': '크리스마스' };
const LUNAR_HOLIDAYS = { '01-01': '설날', '04-08': '부처님오신날', '08-15': '추석' };

// 2. 나만의 프리셋: 루틴 템플릿
const ROUTINE_TEMPLATES = [
  { id: 'r1', icon: '💪', title: '가슴/삼두 PPL', tasks: ['벤치프레스 5x5', '인클라인 덤벨 프레스', '트라이셉스 익스텐션'] },
  { id: 'r2', icon: '🔥', title: '하체/어깨 PPL', tasks: ['스쿼트 5x5', '레그 프레스', '오버헤드 프레스'] },
  { id: 'r3', icon: '📚', title: '전공 & 어학', tasks: ['컴퓨터 구조 복습', '토익 RC 파트 5/6 풀기'] },
  { id: 'r4', icon: '🎮', title: '발로란트 웜업', tasks: ['에임랩 15분', '데스매치 2판', '경쟁전 돌리기'] }
];

export default function App() {
  const [selectedDate, setSelectedDate] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  
  // 캘린더 표시용 연/월 상태
  const [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().split('T')[0]); 
  const currentYear = parseInt(calendarMonth.split('-')[0]);

  // 연/월 선택 팝업 (Month Picker) 상태
  const [isMonthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentYear);

  const [anniversaries, setAnniversaries] = useState([]);
  const [records, setRecords] = useState({});

  // 모달 내부 상태
  const [currentDiary, setCurrentDiary] = useState('');
  const [currentTodos, setCurrentTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTodoText, setEditingTodoText] = useState('');

  // 날짜별 이벤트 계산
  const getEventsForDate = (year, month, day) => {
    const md = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const lunarObj = Lunar.fromDate(new Date(year, month - 1, day));
    const lunarMd = `${String(lunarObj.getMonth()).padStart(2, '0')}-${String(lunarObj.getDay()).padStart(2, '0')}`;
    
    let events = [];
    if (SOLAR_HOLIDAYS[md]) events.push({ text: SOLAR_HOLIDAYS[md], type: 'holiday' });
    if (LUNAR_HOLIDAYS[lunarMd]) events.push({ text: LUNAR_HOLIDAYS[lunarMd], type: 'holiday' });
    
    // 명절 연휴
    const tmr = Lunar.fromDate(new Date(year, month - 1, day + 1));
    const ytd = Lunar.fromDate(new Date(year, month - 1, day - 1));
    if (tmr.getMonth() === 1 && tmr.getDay() === 1 || ytd.getMonth() === 1 && ytd.getDay() === 1) events.push({ text: '설날 연휴', type: 'holiday' });
    if (tmr.getMonth() === 8 && tmr.getDay() === 15 || ytd.getMonth() === 8 && ytd.getDay() === 15) events.push({ text: '추석 연휴', type: 'holiday' });

    anniversaries.forEach(a => {
      if ((a.type === 'solar' && a.date === md) || (a.type === 'lunar' && a.date === lunarMd)) {
        events.push({ text: a.text, type: 'anniv' });
      }
    });
    return events;
  };

  // 렌더링 최적화 및 마커 생성
  const markedDates = useMemo(() => {
    let marks = {};
    const start = new Date(currentYear, 0, 1);
    const end = new Date(currentYear, 11, 31);
    
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear(); const m = d.getMonth() + 1; const day = d.getDate();
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const events = getEventsForDate(y, m, day);
      
      marks[dateStr] = { dots: [] };
      
      // 공휴일이면 날짜 텍스트 아래에 이름을 띄우기 위해 저장
      const holidayEvent = events.find(e => e.type === 'holiday');
      if (holidayEvent) {
        marks[dateStr].isHoliday = true;
        marks[dateStr].holidayName = holidayEvent.text;
      }
      
      if (events.some(e => e.type === 'anniv')) marks[dateStr].dots.push({ key: 'anniv', color: '#448aff' });
    }

    Object.keys(records).forEach(date => {
      if (!marks[date]) marks[date] = { dots: [] };
      const r = records[date];
      if (r.diary || (r.todos && r.todos.length > 0)) {
        marks[date].dots.push({ key: 'record', color: '#ff9800' });
      }
    });

    if (selectedDate) marks[selectedDate] = { ...marks[selectedDate], selected: true };
    return marks;
  }, [currentYear, anniversaries, records, selectedDate]);

  // 캘린더 날짜 클릭
  const handleDayPress = (dateString) => {
    setSelectedDate(dateString);
    if (records[dateString]) {
      setCurrentDiary(records[dateString].diary || '');
      setCurrentTodos(records[dateString].todos || []);
    } else {
      setCurrentDiary(''); setCurrentTodos([]);
    }
    setModalVisible(true);
  };

  // 루틴 템플릿 추가 함수
  const applyRoutine = (routine) => {
    const newTasks = routine.tasks.map((task, idx) => ({
      id: Date.now() + idx, 
      text: task, 
      done: false 
    }));
    setCurrentTodos([...currentTodos, ...newTasks]);
  };

  // 커스텀 달력 셀 UI (공휴일 텍스트 표시)
  const renderDay = ({ date, state, marking }) => {
    const isHoliday = marking?.isHoliday;
    const isSelected = marking?.selected;
    const isSunday = new Date(date.dateString).getDay() === 0;

    return (
      <TouchableOpacity 
        style={[styles.dayCell, isSelected && styles.selectedDay]} 
        onPress={() => handleDayPress(date.dateString)}
      >
        <Text style={[
          styles.dayText, 
          state === 'disabled' ? styles.disabledText : (isHoliday || isSunday) ? styles.holidayText : null,
          isSelected && styles.selectedDayText
        ]}>
          {date.day}
        </Text>
        
        {/* 공휴일 이름 표시 */}
        {isHoliday && <Text style={styles.holidayLabel} numberOfLines={1}>{marking.holidayName}</Text>}
        
        {/* 도트 표시 */}
        <View style={styles.dotsContainer}>
          {marking?.dots?.map((dot, i) => <View key={i} style={[styles.dot, { backgroundColor: dot.color }]} />)}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 커스텀 헤더 (연/월 선택 팝업 트리거) */}
      <TouchableOpacity style={styles.headerButton} onPress={() => { setPickerYear(currentYear); setMonthPickerVisible(true); }}>
        <Text style={styles.headerTitle}>{calendarMonth.split('-')[0]}년 {parseInt(calendarMonth.split('-')[1])}월 ▼</Text>
      </TouchableOpacity>

      <Calendar
        key={calendarMonth} // 월 변경 시 렌더링 강제 업데이트
        current={calendarMonth}
        onMonthChange={(m) => setCalendarMonth(m.dateString)}
        dayComponent={renderDay}
        markedDates={markedDates}
        hideArrows={true} // 커스텀 헤더를 쓰므로 기존 화살표 숨김
        renderHeader={() => null} // 기본 헤더 숨김
      />

      {/* 연/월 선택 Picker 모달 */}
      <Modal visible={isMonthPickerVisible} transparent={true} animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerBox}>
            <View style={styles.pickerYearRow}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)}><Text style={styles.pickerArrow}>◀</Text></TouchableOpacity>
              <Text style={styles.pickerYearText}>{pickerYear}년</Text>
              <TouchableOpacity onPress={() => setPickerYear(y => y + 1)}><Text style={styles.pickerArrow}>▶</Text></TouchableOpacity>
            </View>
            <View style={styles.pickerMonthGrid}>
              {[...Array(12)].map((_, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={styles.pickerMonthBtn} 
                  onPress={() => {
                    setCalendarMonth(`${pickerYear}-${String(i + 1).padStart(2, '0')}-01`);
                    setMonthPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerMonthText}>{i + 1}월</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.pickerCloseBtn} onPress={() => setMonthPickerVisible(false)}>
              <Text style={{color: 'white', fontWeight: 'bold'}}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 다이어리 & To-do 모달 */}
      <Modal visible={isModalVisible} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDate}</Text>
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={() => {
                  setRecords({ ...records, [selectedDate]: { diary: currentDiary, todos: currentTodos } });
                  setModalVisible(false);
                }}
              >
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollArea}>
              
              {/* 루틴 템플릿 (차별점 포인트!) */}
              <Text style={styles.sectionTitle}>⚡ 루틴 불러오기</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routineScroll}>
                {ROUTINE_TEMPLATES.map((routine) => (
                  <TouchableOpacity key={routine.id} style={styles.routineChip} onPress={() => applyRoutine(routine)}>
                    <Text style={styles.routineChipText}>{routine.icon} {routine.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 할 일 (To-do) 영역 */}
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>✅ 할 일</Text>
              <View style={styles.inputRow}>
                <TextInput style={styles.inputBox} placeholder="할 일 추가" value={newTodoText} onChangeText={setNewTodoText} onSubmitEditing={() => { if(newTodoText) { setCurrentTodos([...currentTodos, { id: Date.now(), text: newTodoText, done: false }]); setNewTodoText(''); } }} />
              </View>

              {currentTodos.map((todo) => (
                <View key={todo.id} style={styles.itemRow}>
                  <TouchableOpacity onPress={() => setCurrentTodos(currentTodos.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))} style={{marginRight: 10}}>
                    <Text style={{fontSize: 20, color: '#00adf5'}}>{todo.done ? '☑' : '☐'}</Text>
                  </TouchableOpacity>
                  {editingTodoId === todo.id ? (
                    <TextInput style={styles.editInput} value={editingTodoText} onChangeText={setEditingTodoText} onBlur={() => { setCurrentTodos(currentTodos.map(t => t.id === editingTodoId ? { ...t, text: editingTodoText } : t)); setEditingTodoId(null); }} autoFocus />
                  ) : (
                    <Text style={[styles.todoText, todo.done && {textDecorationLine: 'line-through', color: '#aaa'}]}>{todo.text}</Text>
                  )}
                  <View style={{flexDirection: 'row', marginLeft: 10}}>
                    <TouchableOpacity onPress={() => setCurrentTodos(currentTodos.filter(t => t.id !== todo.id))}><Text>❌</Text></TouchableOpacity>
                  </View>
                </View>
              ))}

              <Text style={[styles.sectionTitle, { marginTop: 25 }]}>📖 일기</Text>
              <TextInput style={styles.diaryInput} placeholder="오늘의 기록을 남겨보세요." multiline={true} value={currentDiary} onChangeText={setCurrentDiary} />
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, backgroundColor: '#ffffff' },
  
  // 헤더 및 Picker UI
  headerButton: { alignSelf: 'center', paddingVertical: 15, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  pickerBox: { backgroundColor: 'white', width: width * 0.8, borderRadius: 15, padding: 20 },
  pickerYearRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pickerYearText: { fontSize: 22, fontWeight: 'bold' },
  pickerArrow: { fontSize: 24, paddingHorizontal: 20, color: '#00adf5' },
  pickerMonthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pickerMonthBtn: { width: '30%', paddingVertical: 15, alignItems: 'center', marginBottom: 10, backgroundColor: '#f0f8ff', borderRadius: 8 },
  pickerMonthText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  pickerCloseBtn: { marginTop: 10, backgroundColor: '#333', padding: 12, borderRadius: 8, alignItems: 'center' },

  // 커스텀 캘린더 셀 UI
  dayCell: { width: 45, height: 50, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 5, borderRadius: 8 },
  selectedDay: { backgroundColor: '#e1f5fe' },
  dayText: { fontSize: 16, color: '#333' },
  disabledText: { color: '#ccc' },
  holidayText: { color: '#e53935', fontWeight: 'bold' },
  selectedDayText: { color: '#0288d1', fontWeight: 'bold' },
  holidayLabel: { fontSize: 9, color: '#e53935', marginTop: 2 },
  dotsContainer: { flexDirection: 'row', marginTop: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 1 },

  // 모달 및 루틴 UI
  modalContainer: { flex: 1, backgroundColor: '#f9f9f9', paddingTop: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  saveButton: { backgroundColor: '#00adf5', padding: 8, borderRadius: 8 },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  scrollArea: { flex: 1, padding: 20 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  routineScroll: { flexDirection: 'row', marginBottom: 10 },
  routineChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 10, elevation: 1 },
  routineChipText: { fontSize: 14, color: '#333', fontWeight: '600' },
  
  inputRow: { flexDirection: 'row', marginBottom: 15 },
  inputBox: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 15, backgroundColor: 'white' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  todoText: { flex: 1, fontSize: 16 },
  editInput: { flex: 1, fontSize: 16, borderBottomWidth: 1, borderColor: '#00adf5', padding: 0 },
  diaryInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 15, minHeight: 180, textAlignVertical: 'top', backgroundColor: 'white', fontSize: 16 },
});