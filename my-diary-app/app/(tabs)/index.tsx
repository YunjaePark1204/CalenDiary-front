import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Dimensions, StatusBar, LayoutAnimation, UIManager, PanResponder } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Lunar } from 'lunar-javascript';
import { LinearGradient } from 'expo-linear-gradient'; 
// ⭐️ 폰트 로딩을 위한 라이브러리
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

const { width } = Dimensions.get('window');

// 폰트 로딩 중에 스플래시 화면 유지
SplashScreen.preventAutoHideAsync();

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PALETTES = {
  peach: { name: '피치 퍼즈', bg: '#FFF9F5', bgModal: '#FFFFFF', main: '#FFBE98', accent: '#FADCB9', text: '#5B4D4D', textDim: '#B4A7A7', holiday: '#FF7675', saturday: '#74B9FF', doneBg: '#FFF0F0', doneCheck: '#FFBE98', diaryBg: '#FFF6F0', diaryBorder: '#FFE8D6' },
  blue: { name: '클래식 블루', bg: '#F0F4F8', bgModal: '#FFFFFF', main: '#0F4C81', accent: '#8CB1DF', text: '#2C3E50', textDim: '#829AB1', holiday: '#E63946', saturday: '#0984E3', doneBg: '#E1E8ED', doneCheck: '#0F4C81', diaryBg: '#F8FAFC', diaryBorder: '#D9E2EC' },
  green: { name: '그리너리', bg: '#F6FFF8', bgModal: '#FFFFFF', main: '#88B04B', accent: '#D4E157', text: '#3D5A80', textDim: '#95A5A6', holiday: '#E07A5F', saturday: '#3D5A80', doneBg: '#E8F5E9', doneCheck: '#88B04B', diaryBg: '#F1FAEE', diaryBorder: '#D8E2DC' },
  peri: { name: '베리 페리', bg: '#F8F5FA', bgModal: '#FFFFFF', main: '#6667AB', accent: '#B3B3D9', text: '#4A235A', textDim: '#9575CD', holiday: '#FF5252', saturday: '#448AFF', doneBg: '#F3E5F5', doneCheck: '#6667AB', diaryBg: '#FAF8FC', diaryBorder: '#EDE7F6' }
};

// ⭐️ 불러온 프리텐다드 폰트 리스트
const FONTS = [
  { id: 'System', name: '기본' },
  { id: 'Pretendard-Regular', name: '프리텐다드' },
  { id: 'Pretendard-Medium', name: '중간체' },
  { id: 'Pretendard-Bold', name: '굵은체' }
];

const CATEGORIES = [
  { id: 'c1', name: '📝 일상', color: '#FFD3B6' },
  { id: 'c2', name: '💪 운동', color: '#FF9A9E' },
  { id: 'c3', name: '📚 과제', color: '#74B9FF' },
  { id: 'c4', name: '🎮 게임', color: '#ba68c8' }
];

const SOLAR_HOLIDAYS = { '01-01': '신정', '03-01': '3·1절', '05-05': '어린이날', '06-06': '현충일', '08-15': '광복절', '10-03': '개천절', '10-09': '한글날', '12-25': '크리스마스' };
const LUNAR_HOLIDAYS = { '01-01': '설날', '04-08': '부처님오신날', '08-15': '추석' };

const CText = ({ style, font, fontScale = 1, children, ...props }) => {
  const flatStyle = StyleSheet.flatten(style) || {};
  const fontSize = (flatStyle.fontSize || 14) * fontScale;
  return <Text style={[style, { fontFamily: font, fontSize }]} {...props}>{children}</Text>;
};
const CTextInput = ({ style, font, fontScale = 1, ...props }) => {
  const flatStyle = StyleSheet.flatten(style) || {};
  const fontSize = (flatStyle.fontSize || 14) * fontScale;
  return <TextInput style={[style, { fontFamily: font, fontSize }]} {...props} />;
};

const CustomDay = React.memo(({ date, state, marking, onDayPress, theme, font, fontScale }) => {
  const isHoliday = marking?.isHoliday;
  const isSelected = marking?.selected;
  const isToday = date.dateString === new Date().toISOString().split('T')[0];
  const isSunday = new Date(date.dateString).getDay() === 0;
  const isSaturday = new Date(date.dateString).getDay() === 6;
  const displayLines = marking?.lines?.slice(0, 3) || [];

  return (
    <TouchableOpacity style={[styles.dayCell, isSelected && {backgroundColor: theme.accent}, isToday && !isSelected && {borderWidth: 1, borderColor: theme.accent}]} onPress={() => onDayPress(date.dateString)}>
      <CText font={font} fontScale={fontScale} style={[styles.dayText, {color: theme.text}, state === 'disabled' ? {color: theme.textDim} : isHoliday || isSunday ? {color: theme.holiday} : isSaturday ? {color: theme.saturday} : null, isSelected && {color: 'white', fontWeight: 'bold'}]}>
        {date.day}
      </CText>
      {isHoliday && <CText font={font} fontScale={fontScale} style={[styles.holidayLabel, {color: theme.holiday}]} numberOfLines={1}>{marking.holidayName}</CText>}
      <View style={styles.linesContainer}>
        {displayLines.map((line, i) => <View key={line.key || i} style={[styles.line, { backgroundColor: line.color }]} />)}
        {marking?.lines?.length > 3 && <View style={[styles.moreDot, {backgroundColor: theme.textDim}]} />}
      </View>
    </TouchableOpacity>
  );
});

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [appFont, setAppFont] = useState('System'); 

  // ⭐️ [핵심] 폰트 실제 불러오는 로직
  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.otf'),
          'Pretendard-Medium': require('../../assets/fonts/Pretendard-Medium.otf'),
          'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.otf'),
        });
      } catch (e) {
        console.warn(e);
      } finally {
        setFontsLoaded(true);
        await SplashScreen.hideAsync();
      }
    }
    loadFonts();
  }, []);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isTodoModalVisible, setTodoModalVisible] = useState(false); 
  const [calendarMonth, setCalendarMonth] = useState(selectedDate); 
  const [calendarKey, setCalendarKey] = useState(0); 
  const [displayedMonthName, setDisplayedMonthName] = useState(selectedDate.substring(0, 7));
  const displayedYear = parseInt(displayedMonthName.split('-')[0]);

  const [isMonthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(displayedYear);

  const [appTheme, setAppTheme] = useState('peach'); 
  const [appFontScale, setAppFontScale] = useState(1.0); 
  const [isSettingsVisible, setSettingsVisible] = useState(false);

  const THEME = PALETTES[appTheme];

  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [collectionFilter, setCollectionFilter] = useState('ALL'); 

  const [customRoutines, setCustomRoutines] = useState([
    { id: 'r1', icon: '☀️', title: '아침 기상', tasks: ['물 한 잔 마시기', '가벼운 스트레칭'], categoryId: 'c1' },
    { id: 'r2', icon: '💻', title: '전공 빡공', tasks: ['컴퓨터 구조 복습', 'C++ 과제 확인'], categoryId: 'c3' },
    { id: 'r3', icon: '🔥', title: 'PPL 루틴', tasks: ['스쿼트 5x5', '레그프레스'], categoryId: 'c2' }
  ]);
  const [isRoutineEditorVisible, setRoutineEditorVisible] = useState(false);
  const [newRoutineIcon, setNewRoutineIcon] = useState('✨');
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineTasksStr, setNewRoutineTasksStr] = useState('');

  const [recurringEvents, setRecurringEvents] = useState([
    { id: 're1', title: '분리수거 하는 날 ♻️', type: 'weekly', dayOfWeek: 2, color: '#ba68c8' },
    { id: 're2', title: '통신비 납부 💸', type: 'monthly', day: 25, color: '#4fc3f7' }
  ]);
  
  const [isEventEditorVisible, setEventEditorVisible] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('once'); 
  const [eventInterval, setEventInterval] = useState('3'); 

  const [records, setRecords] = useState({});
  const [currentDiary, setCurrentDiary] = useState('');
  const [currentTodos, setCurrentTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => { if (gestureState.dy > 50) saveAndClose(); },
    })
  ).current;

  const saveAndClose = () => {
    setRecords(prev => ({ ...prev, [selectedDate]: { diary: currentDiary, todos: currentTodos } }));
    setModalVisible(false);
  };

  const toggleRoutine = (routine) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const isRoutineActive = currentTodos.some(t => t.routineId === routine.id);
    if (isRoutineActive) {
      setCurrentTodos(currentTodos.filter(t => t.routineId !== routine.id));
    } else {
      const cat = CATEGORIES.find(c => c.id === routine.categoryId) || CATEGORIES[0];
      const newTasks = routine.tasks.map((t, idx) => ({ id: Date.now() + idx, text: t, done: false, routineId: routine.id, category: cat }));
      setCurrentTodos([...currentTodos, ...newTasks]);
    }
  };

  const addNewRoutine = () => {
    if (!newRoutineTitle.trim() || !newRoutineTasksStr.trim()) return;
    const tasksArray = newRoutineTasksStr.split(',').map(t => t.trim()).filter(t => t !== '');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCustomRoutines([...customRoutines, { id: 'r_' + Date.now(), icon: newRoutineIcon, title: newRoutineTitle, tasks: tasksArray, categoryId: 'c1' }]);
    setNewRoutineTitle(''); setNewRoutineTasksStr('');
  };

  const deleteRoutine = (id) => { 
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); 
    setCustomRoutines(customRoutines.filter(r => r.id !== id)); 
  };

  const openEventEditor = (event = null) => {
    if (event) {
      setEditingEventId(event.id); setEventTitle(event.title); setEventType(event.type);
      if (event.interval) setEventInterval(event.interval.toString());
    } else {
      setEditingEventId(null); setEventTitle(''); setEventType('once'); setEventInterval('3');
    }
    setEventEditorVisible(true);
  };

  const saveEvent = () => {
    if (!eventTitle.trim()) return;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    let newEvent = { id: editingEventId || 'ev_' + Date.now(), title: eventTitle, type: eventType };
    if (eventType === 'once') { newEvent.date = selectedDate; newEvent.color = '#81c784'; }
    else if (eventType === 'yearly') { newEvent.month = m; newEvent.day = d; newEvent.color = '#ff8a65'; }
    else if (eventType === 'monthly') { newEvent.day = d; newEvent.color = '#4fc3f7'; }
    else if (eventType === 'weekly') { newEvent.dayOfWeek = dateObj.getDay(); newEvent.color = '#ba68c8'; }
    else if (eventType === 'interval') { newEvent.interval = parseInt(eventInterval) || 1; newEvent.startDate = selectedDate; newEvent.color = '#aed581'; }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (editingEventId) setRecurringEvents(recurringEvents.map(e => e.id === editingEventId ? newEvent : e));
    else setRecurringEvents([...recurringEvents, newEvent]);
    setEventEditorVisible(false);
  };

  const getRecurringEventsForDate = useCallback((year, month, day) => {
    const events = [];
    const currentDateObj = new Date(year, month - 1, day);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    recurringEvents.forEach(event => {
      if (event.type === 'once' && event.date === dateStr) events.push(event);
      else if (event.type === 'yearly' && event.month === month && event.day === day) events.push(event);
      else if (event.type === 'monthly' && event.day === day) events.push(event);
      else if (event.type === 'weekly' && currentDateObj.getDay() === event.dayOfWeek) events.push(event);
      else if (event.type === 'interval' && event.startDate) {
        const diffDays = Math.floor((currentDateObj - new Date(event.startDate)) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays % event.interval === 0) events.push(event);
      }
    });
    return events;
  }, [recurringEvents]);

  const baseMarks = useMemo(() => {
    let marks = {};
    const start = new Date(displayedYear - 1, 11, 1); 
    const end = new Date(displayedYear + 1, 0, 31);   
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear(); const m = d.getMonth() + 1; const day = d.getDate();
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const md = `${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const lunarObj = Lunar.fromDate(d);
      const lunarMd = `${String(lunarObj.getMonth()).padStart(2, '0')}-${String(lunarObj.getDay()).padStart(2, '0')}`;
      marks[dateStr] = { lines: [] };
      if (SOLAR_HOLIDAYS[md]) { marks[dateStr].isHoliday = true; marks[dateStr].holidayName = SOLAR_HOLIDAYS[md]; }
      if (LUNAR_HOLIDAYS[lunarMd]) { marks[dateStr].isHoliday = true; marks[dateStr].holidayName = LUNAR_HOLIDAYS[lunarMd]; }
      getRecurringEventsForDate(y, m, day).forEach(e => { marks[dateStr].lines.push({ key: e.id, color: e.color }); });
    }
    Object.keys(records).forEach(date => {
      if (!marks[date]) marks[date] = { lines: [] };
      if (records[date].diary || (records[date].todos && records[date].todos.length > 0)) {
        if(!marks[date].lines.find(l => l.key === 'record')) marks[date].lines.push({ key: 'record', color: THEME.main });
      }
    });
    return marks;
  }, [displayedYear, getRecurringEventsForDate, records, THEME.main]);

  const markedDates = useMemo(() => {
    return { ...baseMarks, [selectedDate]: { ...(baseMarks[selectedDate] || {lines:[]}), selected: true } };
  }, [baseMarks, selectedDate]);

  const handleDayPress = useCallback((dateString) => {
    if (selectedDate === dateString) {
      if (records[dateString]) { setCurrentDiary(records[dateString].diary || ''); setCurrentTodos(records[dateString].todos || []); }
      else { setCurrentDiary(''); setCurrentTodos([]); }
      setModalVisible(true);
    } else {
      setSelectedDate(dateString);
    }
  }, [selectedDate, records]);

  const toggleGlobalTodo = (date, todoId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRecords(prev => {
      const dateRecord = prev[date];
      if (!dateRecord) return prev;
      const updatedTodos = dateRecord.todos.map(t => t.id === todoId ? { ...t, done: !t.done } : t);
      return { ...prev, [date]: { ...dateRecord, todos: updatedTodos } };
    });
  };

  const renderDay = useCallback((props) => {
    return <CustomDay {...props} onDayPress={handleDayPress} theme={THEME} font={appFont} fontScale={appFontScale} />;
  }, [handleDayPress, THEME, appFont, appFontScale]);

  const [sy, sm, sd] = selectedDate.split('-').map(Number);
  const todaySummaryEvents = getRecurringEventsForDate(sy, sm, sd);
  const todaySummaryRecords = records[selectedDate] || { todos: [], diary: '' };

  const filteredDatesWithTodos = useMemo(() => {
    return Object.keys(records).filter(date => {
      const todos = records[date].todos || [];
      if (todos.length === 0) return false;
      if (collectionFilter === 'ALL') return true;
      return todos.some(t => t.category && t.category.id === collectionFilter);
    }).sort((a,b) => b.localeCompare(a));
  }, [records, collectionFilter]);

  // 폰트 로딩 대기
  if (!fontsLoaded) return null;

  return (
    <View style={[styles.container, {backgroundColor: THEME.bg}]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={[styles.calendarArea, {backgroundColor: THEME.bg}]}>
        <View style={styles.floatingHeader}>
          <TouchableOpacity onPress={() => setSettingsVisible(true)} style={{flex: 1, alignItems: 'flex-start', paddingLeft: 10}}>
            <CText font={appFont} fontScale={appFontScale} style={{fontSize: 24}}>⚙️</CText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerButton, { shadowColor: THEME.main }]} onPress={() => { setPickerYear(displayedYear); setMonthPickerVisible(true); }}>
            <CText font={appFont} fontScale={appFontScale} style={[styles.headerTitle, {color: THEME.main}]}>{displayedMonthName.split('-')[0]}년 {parseInt(displayedMonthName.split('-')[1])}월 ▼</CText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTodoModalVisible(true)} style={{flex: 1, alignItems: 'flex-end', paddingRight: 10}}>
            <CText font={appFont} fontScale={appFontScale} style={{fontSize: 24}}>📋</CText>
          </TouchableOpacity>
        </View>

        <Calendar
          key={calendarKey} 
          initialDate={calendarMonth} 
          onMonthChange={(m) => { setDisplayedMonthName(m.dateString.substring(0, 7)); }}
          dayComponent={renderDay} markedDates={markedDates} hideArrows={true} enableSwipeMonths={true} renderHeader={() => null} 
          style={styles.calendarStyle} theme={{ calendarBackground: 'transparent' }}
        />
      </View>

      <View style={[styles.summaryArea, {backgroundColor: THEME.bgModal}]}>
        <LinearGradient colors={[`${THEME.bgModal}00`, THEME.bgModal]} style={styles.summaryGradient} />
        <View style={styles.summaryHeader}>
          <CText font={appFont} fontScale={appFontScale} style={[styles.summaryDateText, {color: THEME.text}]}>{parseInt(sm)}월 {parseInt(sd)}일의 기록</CText>
          <TouchableOpacity onPress={() => handleDayPress(selectedDate)} style={[styles.openDetailBtn, {backgroundColor: THEME.main}]}>
            <CText font={appFont} fontScale={appFontScale} style={styles.openDetailBtnText}>✏️ 다이어리 열기</CText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.summaryContent} showsVerticalScrollIndicator={false}>
          {todaySummaryEvents.length === 0 && todaySummaryRecords.todos.length === 0 && !todaySummaryRecords.diary && (
            <CText font={appFont} fontScale={appFontScale} style={[styles.emptySummaryText, {color: THEME.textDim}]}>일정이 없습니다. 두 번 눌러서 일기를 써보세요! ✨</CText>
          )}
          {todaySummaryEvents.map((ev, idx) => (
            <View key={idx} style={[styles.summaryItemBox, {backgroundColor: THEME.bg}]}>
              <View style={[styles.summaryColorBar, {backgroundColor: ev.color}]} />
              <CText font={appFont} fontScale={appFontScale} style={[styles.summaryItemText, {color: THEME.text}]}>{ev.title}</CText>
            </View>
          ))}
          {todaySummaryRecords.todos.map((todo) => (
            <View key={todo.id} style={[styles.summaryItemBox, {backgroundColor: THEME.bg}]}>
              <CText font={appFont} fontScale={appFontScale} style={{fontSize: 16, marginRight: 10, color: todo.category?.color || THEME.main}}>{todo.done ? '🌸' : '⚪️'}</CText>
              <CText font={appFont} fontScale={appFontScale} style={[styles.summaryItemText, {color: THEME.text}, todo.done && {textDecorationLine: 'line-through', color: THEME.textDim}]}>{todo.text}</CText>
            </View>
          ))}
          {todaySummaryRecords.diary ? (
            <View style={[styles.summaryDiaryBox, {backgroundColor: THEME.doneBg}]}>
              <CText font={appFont} fontScale={appFontScale} style={[styles.summaryDiaryText, {color: THEME.text}]} numberOfLines={3}>{todaySummaryRecords.diary}</CText>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* 설정 모달 */}
      <Modal visible={isSettingsVisible} animationType="fade" transparent={true}>
        <View style={styles.editorOverlay}>
          <View style={[styles.editorBox, {backgroundColor: THEME.bgModal}]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
              <CText font={appFont} fontScale={appFontScale} style={[styles.editorTitle, {color: THEME.text}]}>앱 설정 ⚙️</CText>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}><CText font={appFont} fontScale={appFontScale} style={{fontSize: 20}}>❌</CText></TouchableOpacity>
            </View>

            <CText font={appFont} fontScale={appFontScale} style={{fontWeight: 'bold', color: THEME.text, marginBottom: 10}}>🔍 글씨 크기</CText>
            <View style={{flexDirection: 'row', marginBottom: 20}}>
              {[{label: '작게', scale: 0.85}, {label: '보통', scale: 1.0}, {label: '크게', scale: 1.15}].map(opt => (
                <TouchableOpacity key={opt.label} onPress={() => setAppFontScale(opt.scale)} style={[styles.typeChip, {backgroundColor: THEME.bg, borderColor: '#eee'}, appFontScale === opt.scale && {backgroundColor: THEME.main, borderColor: THEME.main}]}>
                  <CText font={appFont} fontScale={appFontScale} style={[styles.typeChipText, {color: THEME.textDim}, appFontScale === opt.scale && {color: 'white'}]}>{opt.label}</CText>
                </TouchableOpacity>
              ))}
            </View>

            <CText font={appFont} fontScale={appFontScale} style={{fontWeight: 'bold', color: THEME.text, marginBottom: 15}}>🎨 테마 색상 (Pantone)</CText>
            <View style={{flexDirection: 'row', justifyContent: 'space-around', marginBottom: 25}}>
              {Object.keys(PALETTES).map(themeKey => (
                <TouchableOpacity key={themeKey} onPress={() => setAppTheme(themeKey)} 
                  style={{ width: 45, height: 45, borderRadius: 22.5, backgroundColor: PALETTES[themeKey].main, borderWidth: appTheme === themeKey ? 3 : 0, borderColor: THEME.text }} 
                />
              ))}
            </View>

            <CText font={appFont} fontScale={appFontScale} style={{fontWeight: 'bold', color: THEME.text, marginBottom: 10}}>✍️ 앱 폰트 변경</CText>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15}}>
              {FONTS.map(f => (
                <TouchableOpacity key={f.id} onPress={() => setAppFont(f.id)} style={[styles.typeChip, {backgroundColor: THEME.bg, borderColor: '#eee'}, appFont === f.id && {backgroundColor: THEME.main, borderColor: THEME.main}]}>
                  <CText font={f.id} fontScale={appFontScale} style={[styles.typeChipText, {color: THEME.textDim}, appFont === f.id && {color: 'white'}]}>{f.name}</CText>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.saveButton, {backgroundColor: THEME.main}]} onPress={() => setSettingsVisible(false)}>
              <CText font={appFont} fontScale={appFontScale} style={styles.saveButtonText}>적용하기</CText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 투두메이트 모아보기 모달 */}
      <Modal visible={isTodoModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: THEME.bgModal }}>
          <LinearGradient colors={[`${THEME.main}10`, THEME.bgModal]} style={styles.modalBgGradient}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInner}>
                <CText font={appFont} fontScale={appFontScale} style={[styles.modalTitle, {color: THEME.text}]}>할 일 모아보기 📋</CText>
                <TouchableOpacity style={[styles.saveButton, {backgroundColor: THEME.main, width: 80}]} onPress={() => setTodoModalVisible(false)}>
                  <CText font={appFont} fontScale={appFontScale} style={styles.saveButtonText}>닫기</CText>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{paddingHorizontal: 20, marginBottom: 15}}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row'}}>
                <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCollectionFilter('ALL'); }} style={[styles.filterChip, collectionFilter === 'ALL' && {backgroundColor: THEME.text}]}>
                  <CText font={appFont} fontScale={appFontScale} style={[styles.filterChipText, collectionFilter === 'ALL' && {color: 'white'}]}>전체 보기</CText>
                </TouchableOpacity>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat.id} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCollectionFilter(cat.id); }} style={[styles.filterChip, collectionFilter === cat.id && {backgroundColor: cat.color, borderColor: cat.color}]}>
                    <CText font={appFont} fontScale={appFontScale} style={[styles.filterChipText, collectionFilter === cat.id && {color: 'white'}]}>{cat.name}</CText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {filteredDatesWithTodos.map(date => {
                const displayTodos = collectionFilter === 'ALL' ? records[date].todos : records[date].todos.filter(t => t.category && t.category.id === collectionFilter);
                if (displayTodos.length === 0) return null;
                return (
                  <View key={date} style={{marginBottom: 25}}>
                    <CText font={appFont} fontScale={appFontScale} style={{fontSize: 18, fontWeight: '900', color: THEME.main, marginBottom: 10}}>{date.replace(/-/g, ' / ')}</CText>
                    {displayTodos.map(todo => (
                      <View key={todo.id} style={[styles.todoItemRow, {backgroundColor: THEME.bgModal, borderLeftColor: todo.category?.color || THEME.main, padding: 12}]}>
                        <TouchableOpacity onPress={() => toggleGlobalTodo(date, todo.id)} style={styles.todoCheckArea}>
                          <View style={[styles.stickerCheck, todo.done && {backgroundColor: todo.category?.color || THEME.main, borderColor: 'white'}, {width: 26, height: 26, borderRadius: 13}]}>
                            {todo.done && <CText font={appFont} fontScale={appFontScale} style={[styles.stickerCheckIcon, {fontSize: 12}]}>🎀</CText>}
                          </View>
                        </TouchableOpacity>
                        <CText font={appFont} fontScale={appFontScale} style={[styles.todoText, {color: THEME.text}, todo.done && {textDecorationLine: 'line-through', color: THEME.textDim}]}>{todo.text}</CText>
                      </View>
                    ))}
                  </View>
                )
              })}
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </Modal>

      {/* 월 선택 바텀 시트 */}
      <Modal visible={isMonthPickerVisible} transparent={true} animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity style={{flex: 1}} onPress={() => setMonthPickerVisible(false)} />
          <View style={[styles.bottomSheetContainer, {backgroundColor: THEME.bgModal}]}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.pickerYearRow}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setPickerYear(y => y - 1)}><CText font={appFont} fontScale={appFontScale} style={[styles.arrowText, {color: THEME.main}]}>◀</CText></TouchableOpacity>
              <CText font={appFont} fontScale={appFontScale} style={[styles.pickerYearText, {color: THEME.text}]}>{pickerYear}년</CText>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setPickerYear(y => y + 1)}><CText font={appFont} fontScale={appFontScale} style={[styles.arrowText, {color: THEME.main}]}>▶</CText></TouchableOpacity>
            </View>
            <View style={styles.pickerMonthGrid}>
              {[...Array(12)].map((_, i) => (
                <TouchableOpacity key={i} style={[styles.pickerMonthBtn, {backgroundColor: THEME.bg}]} onPress={() => { 
                  const newDate = `${pickerYear}-${String(i + 1).padStart(2, '0')}-01`;
                  setCalendarMonth(newDate); setDisplayedMonthName(newDate.substring(0, 7));
                  setCalendarKey(prev => prev + 1); setMonthPickerVisible(false); 
                }}>
                  <Text style={[styles.pickerMonthText, {color: THEME.main}]}>{i + 1}월</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* 상세 다이어리 모달 */}
      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={saveAndClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: THEME.bgModal }}>
          <LinearGradient colors={[`${THEME.main}10`, THEME.bgModal]} style={styles.modalBgGradient}>
            <View {...panResponder.panHandlers} style={styles.modalHeader}>
              <View style={styles.swipeIndicator} />
              <View style={styles.modalHeaderInner}>
                <CText font={appFont} fontScale={appFontScale} style={[styles.modalTitle, {color: THEME.text}]}>{selectedDate}</CText>
                <TouchableOpacity style={[styles.saveButton, {backgroundColor: THEME.main, width: 80}]} onPress={saveAndClose}>
                  <CText font={appFont} fontScale={appFontScale} style={styles.saveButtonText}>완료</CText>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}>
              <View style={styles.todayEventBox}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                  <CText font={appFont} fontScale={appFontScale} style={[styles.sectionTitle, {color: THEME.text}]}>✨ 캘린더 일정</CText>
                  <TouchableOpacity onPress={() => openEventEditor()}><CText font={appFont} fontScale={appFontScale} style={{color: THEME.main, fontWeight: 'bold'}}>+ 일정 추가</CText></TouchableOpacity>
                </View>
                {todaySummaryEvents.map((ev, idx) => (
                  <View key={idx} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                    <View style={[styles.tagBadge, { backgroundColor: ev.color + '20' }]}><CText font={appFont} fontScale={appFontScale} style={{color: ev.color, fontWeight: 'bold'}}>{ev.title}</CText></View>
                    <TouchableOpacity onPress={() => openEventEditor(ev)} style={{marginLeft: 5}}><CText font={appFont} fontScale={appFontScale}>✏️</CText></TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, marginTop: 10}}>
                <CText font={appFont} fontScale={appFontScale} style={[styles.sectionTitle, {marginBottom: 0, color: THEME.text}]}>⚡ 루틴 추가</CText>
                <TouchableOpacity onPress={() => setRoutineEditorVisible(true)}><CText font={appFont} fontScale={appFontScale} style={{color: THEME.main, fontWeight: 'bold'}}>⚙️ 루틴 설정</CText></TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routineScroll}>
                {customRoutines.map((routine) => (
                  <TouchableOpacity key={routine.id} style={[styles.routineChip, {backgroundColor: THEME.bgModal}, currentTodos.some(t => t.routineId === routine.id) && {backgroundColor: THEME.main}]} onPress={() => toggleRoutine(routine)}>
                    <CText font={appFont} fontScale={appFontScale} style={[styles.routineChipText, {color: THEME.text}, currentTodos.some(t => t.routineId === routine.id) && {color: 'white'}]}>{routine.icon} {routine.title}</CText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <CText font={appFont} fontScale={appFontScale} style={[styles.sectionTitle, {color: THEME.text}]}>✅ 할 일 (투두)</CText>
              <View style={{marginBottom: 10}}><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row'}}>{CATEGORIES.map(cat => (
                <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat)} style={[styles.filterChip, selectedCategory.id === cat.id && {backgroundColor: cat.color, borderColor: cat.color}]}><CText font={appFont} fontScale={appFontScale} style={[styles.filterChipText, selectedCategory.id === cat.id && {color: 'white'}]}>{cat.name}</CText></TouchableOpacity>
              ))}</ScrollView></View>
              <View style={styles.inputRow}><CTextInput font={appFont} fontScale={appFontScale} style={[styles.inputBox, {backgroundColor: THEME.bgModal, color: THEME.text}]} placeholder={`${selectedCategory.name} 할 일을 입력하세요`} value={newTodoText} onChangeText={setNewTodoText} onSubmitEditing={() => { if(newTodoText) { setCurrentTodos([...currentTodos, { id: Date.now(), text: newTodoText, done: false, category: selectedCategory }]); setNewTodoText(''); } }} /></View>
              {currentTodos.map((todo) => (
                <View key={todo.id} style={[styles.todoItemRow, {backgroundColor: THEME.bgModal, borderLeftColor: todo.category?.color || THEME.main}]}>
                  <TouchableOpacity onPress={() => toggleTodo(todo.id)} style={styles.todoCheckArea}><View style={[styles.stickerCheck, todo.done && {backgroundColor: todo.category?.color || THEME.main, borderColor: 'white'}]}>{todo.done && <CText font={appFont} fontScale={appFontScale} style={styles.stickerCheckIcon}>🎀</CText>}</View></TouchableOpacity>
                  <CText font={appFont} fontScale={appFontScale} style={[styles.todoText, {color: THEME.text}, todo.done && {textDecorationLine: 'line-through', color: THEME.textDim}]}>{todo.text}</CText>
                  <TouchableOpacity onPress={() => setCurrentTodos(currentTodos.filter(t => t.id !== todo.id))} style={styles.todoDelete}><CText font={appFont} fontScale={appFontScale}>❌</CText></TouchableOpacity>
                </View>
              ))}
              <CText font={appFont} fontScale={appFontScale} style={[styles.sectionTitle, { marginTop: 25, color: THEME.text }]}>📖 다이어리</CText>
              <View style={[styles.diaryInputContainer, { flex: 1, backgroundColor: THEME.diaryBg, borderColor: THEME.diaryBorder }]}><CTextInput font={appFont} fontScale={appFontScale} style={[styles.diaryInput, {color: THEME.text}]} placeholder="오늘 하루는 어땠나요?" multiline={true} value={currentDiary} onChangeText={setCurrentDiary} /></View>
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  calendarArea: { paddingTop: Platform.OS === 'ios' ? 50 : 30, zIndex: 2, paddingBottom: 10 },
  floatingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 20 },
  headerButton: { backgroundColor: 'white', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 25, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 5 },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  collectionBtn: { backgroundColor: 'white', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 },
  calendarStyle: { backgroundColor: 'transparent', paddingHorizontal: 5 },
  dayCell: { width: 40, height: 44, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4, borderRadius: 12 },
  dayText: { fontSize: 15, fontWeight: '700' },
  holidayLabel: { fontSize: 8, marginTop: 1, fontWeight: 'bold' },
  linesContainer: { width: '80%', alignItems: 'center', marginTop: 3 },
  line: { width: '100%', height: 3.5, borderRadius: 2, marginBottom: 1.5 },
  moreDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  summaryArea: { flex: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  summaryGradient: { position: 'absolute', top: -15, left: 0, right: 0, height: 15 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  summaryDateText: { fontSize: 20, fontWeight: '900' },
  openDetailBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  openDetailBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  summaryContent: { flex: 1 },
  emptySummaryText: { textAlign: 'center', marginTop: 30, fontSize: 15 },
  summaryItemBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8 },
  summaryColorBar: { width: 4, height: '100%', borderRadius: 2, marginRight: 10 },
  summaryItemText: { fontSize: 15, fontWeight: '600', flex: 1 },
  summaryDiaryBox: { padding: 15, borderRadius: 12, marginTop: 5 },
  summaryDiaryText: { fontSize: 14, lineHeight: 22 },
  filterChip: { backgroundColor: 'white', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#eee', marginRight: 8, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, elevation: 2 },
  filterChipText: { fontSize: 13, fontWeight: '700' },
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(91,77,77,0.3)', justifyContent: 'flex-end' },
  bottomSheetContainer: { borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 50 },
  bottomSheetHandle: { width: 50, height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginBottom: 25 },
  pickerYearRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, paddingHorizontal: 20 },
  pickerYearText: { fontSize: 26, fontWeight: '900' },
  arrowBtn: { backgroundColor: '#F0F0F0', padding: 12, borderRadius: 25 },
  arrowText: { fontSize: 18 },
  pickerMonthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pickerMonthBtn: { width: '23%', paddingVertical: 18, alignItems: 'center', marginBottom: 18, borderRadius: 20, borderWidth: 1, borderColor: '#FFE2E2' },
  pickerMonthText: { fontSize: 16, fontWeight: '800' },
  modalBgGradient: { flex: 1 },
  modalHeader: { paddingTop: Platform.OS === 'ios' ? 20 : 30, paddingBottom: 10, paddingHorizontal: 25 },
  swipeIndicator: { width: 45, height: 6, backgroundColor: '#ddd', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  modalHeaderInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 26, fontWeight: '900' },
  saveButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, alignSelf: 'stretch' },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  scrollArea: { flex: 1, paddingHorizontal: 20 },
  todayEventBox: { marginBottom: 20, backgroundColor: 'rgba(255, 240, 240, 0.5)', padding: 15, borderRadius: 20 },
  tagBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15 },
  sectionTitle: { fontSize: 19, fontWeight: '800', marginBottom: 10 },
  routineScroll: { flexDirection: 'row', marginBottom: 20, paddingLeft: 5, maxHeight: 50 },
  routineChip: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 25, marginRight: 12, shadowColor: '#B4A7A7', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  routineChipText: { fontSize: 14, fontWeight: '700' },
  inputRow: { flexDirection: 'row', marginBottom: 15 },
  inputBox: { flex: 1, borderRadius: 15, padding: 15, fontSize: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  todoItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 15, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 2, borderLeftWidth: 5 },
  todoCheckArea: { marginRight: 15 },
  stickerCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  stickerCheckIcon: { fontSize: 14 },
  todoText: { flex: 1, fontSize: 16, fontWeight: '600' },
  todoDelete: { padding: 5 },
  diaryInputContainer: { borderRadius: 20, overflow: 'hidden', marginTop: 10, borderWidth: 1 },
  diaryInput: { flex: 1, padding: 20, textAlignVertical: 'top', fontSize: 16, lineHeight: 26 },
  editorOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  editorBox: { padding: 25, borderRadius: 25 },
  editorTitle: { fontSize: 20, fontWeight: 'bold' },
  editorInput: { borderWidth: 1, borderColor: '#eee', borderRadius: 15, padding: 15, fontSize: 15 },
  editorRoutineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  typeSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15, justifyContent: 'center' },
  typeChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#eee', margin: 4 },
  typeChipText: { fontWeight: '600', fontSize: 13 },
});