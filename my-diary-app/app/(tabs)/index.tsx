import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Dimensions, StatusBar, LayoutAnimation, UIManager, PanResponder, Image, Switch } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Lunar } from 'lunar-javascript';
import { LinearGradient } from 'expo-linear-gradient'; 
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as ImagePicker from 'expo-image-picker';
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';

const { width, height } = Dimensions.get('window');

// ⭐️ 백엔드 서버 통신용 IP (본인 PC의 실제 내부 IP로 변경 필수!)
const SERVER_IP = '172.30.162.83'; 

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

const CATEGORIES = [
  { id: 'c1', name: '📝 일상', color: '#FFD3B6' },
  { id: 'c2', name: '💪 운동', color: '#FF9A9E' },
  { id: 'c3', name: '📚 과제', color: '#74B9FF' },
  { id: 'c4', name: '🎮 게임', color: '#ba68c8' }
];

// ⭐️ 방금 전 누락되었던 녀석들입니다! 다시 무사히 복구했습니다.
const SOLAR_HOLIDAYS = { '01-01': '신정', '03-01': '3·1절', '05-05': '어린이날', '06-06': '현충일', '08-15': '광복절', '10-03': '개천절', '10-09': '한글날', '12-25': '크리스마스' };
const LUNAR_HOLIDAYS = { '01-01': '설날', '04-08': '부처님오신날', '08-15': '추석' };

const DEFAULT_API_STATS = [
  { id: 'github', title: '🐙 GitHub', desc: '데이터 로딩 중...', sub: '', bg: '#24292e' },
  { id: 'val', title: '🔫 Valorant', desc: '데이터 로딩 중...', sub: '', bg: '#ff4655' },
  { id: 'lol', title: '⚔️ LoL', desc: '데이터 로딩 중...', sub: '', bg: '#0bc6e3' },
  { id: 'tft', title: '♟️ TFT', desc: '데이터 로딩 중...', sub: '', bg: '#e6a822' }
];

const getFontFamily = (style) => {
  const flatStyle = StyleSheet.flatten(style) || {};
  if (flatStyle.fontWeight === 'bold' || flatStyle.fontWeight === '700' || flatStyle.fontWeight === '900') return 'Pretendard-Bold';
  if (flatStyle.fontWeight === '500' || flatStyle.fontWeight === '600') return 'Pretendard-Medium';
  return 'Pretendard-Regular';
};

const CText = ({ style, fontScale = 1, children, ...props }) => {
  const flatStyle = StyleSheet.flatten(style) || {};
  const fontSize = (flatStyle.fontSize || 14) * fontScale;
  return <Text style={[style, { fontFamily: getFontFamily(style), fontSize }]} {...props}>{children}</Text>;
};

const CTextInput = ({ style, fontScale = 1, ...props }) => {
  const flatStyle = StyleSheet.flatten(style) || {};
  const fontSize = (flatStyle.fontSize || 14) * fontScale;
  return <TextInput style={[style, { fontFamily: getFontFamily(style), fontSize }]} {...props} />;
};

const CustomDay = React.memo(({ date, state, marking, onDayPress, theme, fontScale }) => {
  const isHoliday = marking?.isHoliday;
  const isSelected = marking?.selected;
  const isToday = date.dateString === new Date().toISOString().split('T')[0];
  const isSunday = new Date(date.dateString).getDay() === 0;
  const isSaturday = new Date(date.dateString).getDay() === 6;
  const displayLines = marking?.lines?.slice(0, 3) || [];

  return (
    <TouchableOpacity style={[styles.dayCell, isSelected && {backgroundColor: theme.accent}, isToday && !isSelected && {borderWidth: 1, borderColor: theme.accent}]} onPress={() => onDayPress(date.dateString)}>
      <CText fontScale={fontScale} style={[styles.dayText, {color: theme.text}, state === 'disabled' ? {color: theme.textDim} : isHoliday || isSunday ? {color: theme.holiday} : isSaturday ? {color: theme.saturday} : null, isSelected && {color: 'white', fontWeight: 'bold'}]}>
        {date.day}
      </CText>
      {isHoliday && <CText fontScale={fontScale} style={[styles.holidayLabel, {color: theme.holiday}]} numberOfLines={1}>{marking.holidayName}</CText>}
      <View style={styles.linesContainer}>
        {displayLines.map((line, i) => <View key={line.key || i} style={[styles.line, { backgroundColor: line.color }]} />)}
        {marking?.lines?.length > 3 && <View style={[styles.moreDot, {backgroundColor: theme.textDim}]} />}
      </View>
    </TouchableOpacity>
  );
});

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

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

  // 계정 정보 및 표시 설정 (토글용)
  const [githubId, setGithubId] = useState('');
  const [riotName, setRiotName] = useState('');
  const [riotTag, setRiotTag] = useState('');
  const [showGithub, setShowGithub] = useState(true);
  const [showValorant, setShowValorant] = useState(true);
  const [showLol, setShowLol] = useState(true);
  const [showTft, setShowTft] = useState(true);

  const [apiStats, setApiStats] = useState(DEFAULT_API_STATS);
  const [rawApiData, setRawApiData] = useState(null);

  const [customRoutines, setCustomRoutines] = useState([
    { id: 'r1', icon: '☀️', title: '아침 기상', tasks: ['물 한 잔 마시기', '가벼운 스트레칭'], categoryId: 'c1' },
    { id: 'r2', icon: '💻', title: '전공 빡공', tasks: ['컴퓨터 구조 복습', 'C++ 과제 확인'], categoryId: 'c3' },
    { id: 'r3', icon: '🔥', title: 'PPL 루틴', tasks: ['스쿼트 5x5', '레그프레스'], categoryId: 'c2' }
  ]);
  
  const [isRoutineEditorVisible, setRoutineEditorVisible] = useState(false);
  const [isEventEditorVisible, setEventEditorVisible] = useState(false);
  const [isDiaryPreview, setIsDiaryPreview] = useState(false);

  const [newRoutineIcon, setNewRoutineIcon] = useState('✨');
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineTasksStr, setNewRoutineTasksStr] = useState('');

  const [recurringEvents, setRecurringEvents] = useState([
    { id: 're1', title: '분리수거 하는 날 ♻️', type: 'weekly', dayOfWeek: 2, color: '#ba68c8' },
    { id: 're2', title: '통신비 납부 💸', type: 'monthly', day: 25, color: '#4fc3f7' }
  ]);
  
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('once'); 
  const [eventInterval, setEventInterval] = useState('3'); 

  const [records, setRecords] = useState({});
  const [currentDiary, setCurrentDiary] = useState('');
  const [currentTodos, setCurrentTodos] = useState([]);
  const [currentPhotos, setCurrentPhotos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');

  // 기기에 영구 저장된 다이어리 기록들 복구
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const savedRecords = await AsyncStorage.getItem('diary_records');
        if (savedRecords) {
          setRecords(JSON.parse(savedRecords));
        }
      } catch (e) {
        console.warn('기록 복구 실패', e);
      }
    };
    loadRecords();
  }, []);

  // 날짜 변경 시 API 호출 & 설정 로드
  useEffect(() => {
    const loadSettingsAndFetch = async () => {
      try {
        const storedGithub = await AsyncStorage.getItem('githubId');
        const storedRiotName = await AsyncStorage.getItem('riotName');
        const storedRiotTag = await AsyncStorage.getItem('riotTag');
        
        const sGh = await AsyncStorage.getItem('showGithub');
        const sVal = await AsyncStorage.getItem('showValorant');
        const sLol = await AsyncStorage.getItem('showLol');
        const sTft = await AsyncStorage.getItem('showTft');

        if (storedGithub) setGithubId(storedGithub);
        if (storedRiotName) setRiotName(storedRiotName);
        if (storedRiotTag) setRiotTag(storedRiotTag);
        if (sGh !== null) setShowGithub(JSON.parse(sGh));
        if (sVal !== null) setShowValorant(JSON.parse(sVal));
        if (sLol !== null) setShowLol(JSON.parse(sLol));
        if (sTft !== null) setShowTft(JSON.parse(sTft));

        if (storedGithub && storedRiotName && storedRiotTag) {
          setApiStats(DEFAULT_API_STATS); 
          fetchBackendStats(storedGithub, storedRiotName, storedRiotTag, selectedDate);
        } else {
          setApiStats([{ id: 'info', title: '⚙️ 설정 필요', desc: '설정에서 계정을 연동해주세요.', sub: '', bg: '#95A5A6' }]);
        }
      } catch (e) {
        console.warn('설정 불러오기 실패', e);
      }
    };
    loadSettingsAndFetch();
  }, [selectedDate]); 

  const fetchBackendStats = async (gitId, rName, rTag, dateStr) => {
    try {
      const url = `http://${SERVER_IP}:8080/api/stats?github=${gitId}&riot_name=${rName}&riot_tag=${rTag}&date=${dateStr}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && !data.error) {
        setRawApiData(data);
        setApiStats([
          { id: 'github', title: '🐙 GitHub', desc: `해당 날짜 커밋: ${data.github.commits}개`, sub: '조회 완료', bg: '#24292e' },
          { id: 'val', title: '🔫 Valorant', desc: `${data.valorant.rank} (${data.valorant.rr} RR)`, sub: '최근 랭크', bg: '#ff4655' },
          { id: 'lol', title: '⚔️ LoL', desc: data.lol.tier === 'Unranked' ? 'Unranked' : `${data.lol.tier} (${data.lol.lp} LP)`, sub: `${data.lol.wins}승 ${data.lol.loss}패`, bg: '#0bc6e3' },
          { id: 'tft', title: '♟️ TFT', desc: data.tft.tier === 'Unranked' ? 'Unranked' : `${data.tft.tier} (${data.tft.lp} LP)`, sub: `${data.tft.wins}승 ${data.tft.loss}패`, bg: '#e6a822' }
        ]);
      }
    } catch (e) {
      setRawApiData(null);
      setApiStats([{ id: 'error', title: '🚨 연결 실패', desc: 'PC 백엔드 또는 Wi-Fi 확인!', sub: '에러 발생', bg: '#e74c3c' }]);
    }
  };

  const visibleStats = apiStats.filter(stat => {
    if (stat.id === 'github') return showGithub;
    if (stat.id === 'val') return showValorant;
    if (stat.id === 'lol') return showLol;
    if (stat.id === 'tft') return showTft;
    return true; 
  });

  const saveSettings = async () => {
    await AsyncStorage.setItem('githubId', githubId);
    await AsyncStorage.setItem('riotName', riotName);
    await AsyncStorage.setItem('riotTag', riotTag);
    await AsyncStorage.setItem('showGithub', JSON.stringify(showGithub));
    await AsyncStorage.setItem('showValorant', JSON.stringify(showValorant));
    await AsyncStorage.setItem('showLol', JSON.stringify(showLol));
    await AsyncStorage.setItem('showTft', JSON.stringify(showTft));

    setSettingsVisible(false);
    fetchBackendStats(githubId, riotName, riotTag, selectedDate);
  };

  const markdownStyles = useMemo(() => ({
    body: { fontFamily: 'Pretendard-Regular', fontSize: 16 * appFontScale, color: THEME.text, lineHeight: 24 },
    heading1: { fontFamily: 'Pretendard-Bold', color: THEME.main, marginTop: 10, marginBottom: 5 },
    heading2: { fontFamily: 'Pretendard-Bold', color: THEME.text, marginTop: 10, marginBottom: 5 },
    code_block: { backgroundColor: THEME.doneBg, borderRadius: 10, padding: 15, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: THEME.text, borderWidth: 1, borderColor: THEME.diaryBorder },
    fence: { backgroundColor: THEME.doneBg, borderRadius: 10, padding: 15, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: THEME.text, borderWidth: 1, borderColor: THEME.diaryBorder },
    code_inline: { backgroundColor: THEME.doneBg, borderRadius: 5, paddingHorizontal: 5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: THEME.main },
    blockquote: { borderLeftWidth: 4, borderLeftColor: THEME.main, paddingLeft: 10, backgroundColor: THEME.diaryBg, marginLeft: 0 },
    list_item: { marginVertical: 3 }
  }), [THEME, appFontScale]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newUris = result.assets.map(asset => asset.uri);
      setCurrentPhotos(prev => [...prev, ...newUris]);
    }
  };

  const deleteEvent = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRecurringEvents(recurringEvents.filter(e => e.id !== id));
  };

  const saveAndClose = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRecords(prev => {
      const newRecords = {
        ...prev,
        [selectedDate]: {
          diary: currentDiary,
          todos: currentTodos,
          photos: currentPhotos,
          apiStats: rawApiData 
        }
      };
      AsyncStorage.setItem('diary_records', JSON.stringify(newRecords));
      return newRecords;
    });
    setIsDiaryPreview(false);
    setModalVisible(false);
  }, [selectedDate, currentDiary, currentTodos, currentPhotos, rawApiData]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderRelease: (evt, gestureState) => { if (gestureState.dy > 50) saveAndClose(); },
  })).current;

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
    let newEvent = { id: editingEventId || 'ev_' + Date.now(), title: eventTitle, type: eventType, color: '#81c784' };
    
    if (eventType === 'once') { newEvent.date = selectedDate; }
    else if (eventType === 'daily') { newEvent.startDate = selectedDate; }
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
      else if (event.type === 'daily' && currentDateObj >= new Date(event.startDate)) events.push(event);
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
      if (records[date].diary || (records[date].todos && records[date].todos.length > 0) || (records[date].photos && records[date].photos.length > 0)) {
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
      if (records[dateString]) { 
        setCurrentDiary(records[dateString].diary || ''); 
        setCurrentTodos(records[dateString].todos || []); 
        setCurrentPhotos(records[dateString].photos || []); 
      } else { 
        setCurrentDiary(''); 
        setCurrentTodos([]); 
        setCurrentPhotos([]);
      }
      setIsDiaryPreview(false);
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
      
      const newRecords = { ...prev, [date]: { ...dateRecord, todos: updatedTodos } };
      AsyncStorage.setItem('diary_records', JSON.stringify(newRecords)); 
      return newRecords;
    });
  };

  const renderDay = useCallback((props) => {
    return <CustomDay {...props} onDayPress={handleDayPress} theme={THEME} fontScale={appFontScale} />;
  }, [handleDayPress, THEME, appFontScale]);

  const [sy, sm, sd] = selectedDate.split('-').map(Number);
  const todaySummaryEvents = getRecurringEventsForDate(sy, sm, sd);
  const todaySummaryRecords = records[selectedDate] || { todos: [], diary: '', photos: [] };

  const filteredDatesWithTodos = useMemo(() => {
    return Object.keys(records).filter(date => {
      const todos = records[date].todos || [];
      if (todos.length === 0) return false;
      if (collectionFilter === 'ALL') return true;
      return todos.some(t => t.category && t.category.id === collectionFilter);
    }).sort((a,b) => b.localeCompare(a));
  }, [records, collectionFilter]);

  const graphDates = useMemo(() => Object.keys(records).sort().slice(-7), [records]); 
  const chartLabels = graphDates.map(d => d.substring(5)); 

  if (!fontsLoaded) return null;

  return (
    <View style={[styles.container, {backgroundColor: THEME.bg}]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={[styles.calendarArea, {backgroundColor: THEME.bg}]}>
        <View style={styles.floatingHeader}>
          <View style={{flex: 1}} />
          <TouchableOpacity style={[styles.headerButton, { shadowColor: THEME.main }]} onPress={() => { setPickerYear(displayedYear); setMonthPickerVisible(true); }}>
            <CText fontScale={appFontScale} style={[styles.headerTitle, {color: THEME.main}]}>{displayedMonthName.split('-')[0]}년 {parseInt(displayedMonthName.split('-')[1])}월 ▼</CText>
          </TouchableOpacity>
          <View style={{flex: 1}} />
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
          <CText fontScale={appFontScale} style={[styles.summaryDateText, {color: THEME.text}]}>{parseInt(sm)}월 {parseInt(sd)}일의 기록</CText>
          <TouchableOpacity onPress={() => handleDayPress(selectedDate)} style={[styles.openDetailBtn, {backgroundColor: THEME.main}]}>
            <CText fontScale={appFontScale} style={styles.openDetailBtnText}>✏️ 다이어리 열기</CText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.summaryContent} showsVerticalScrollIndicator={false}>
          
          {(showGithub || showValorant || showLol || showTft) && (
            <>
              <CText fontScale={appFontScale} style={[styles.sectionTitle, {marginTop: 0, marginBottom: 10, color: THEME.text}]}>🎮 데브 & 랭크 요약</CText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20, paddingBottom: 5}}>
                {visibleStats.map((stat) => (
                  <View key={stat.id} style={[styles.statCard, {backgroundColor: stat.bg}]}>
                    <CText fontScale={appFontScale} style={styles.statCardTitle}>{stat.title}</CText>
                    <CText fontScale={appFontScale} style={styles.statCardDesc}>{stat.desc}</CText>
                    <CText fontScale={appFontScale} style={styles.statCardSub}>{stat.sub}</CText>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {todaySummaryEvents.length === 0 && todaySummaryRecords.todos.length === 0 && !todaySummaryRecords.diary && todaySummaryRecords.photos?.length === 0 && (
            <CText fontScale={appFontScale} style={[styles.emptySummaryText, {color: THEME.textDim}]}>일정이 없습니다. 두 번 눌러서 일기를 써보세요! ✨</CText>
          )}
          
          {todaySummaryEvents.map((ev, idx) => (
            <View key={idx} style={[styles.summaryItemBox, {backgroundColor: THEME.bg}]}>
              <View style={[styles.summaryColorBar, {backgroundColor: ev.color}]} />
              <CText fontScale={appFontScale} style={[styles.summaryItemText, {color: THEME.text}]}>{ev.title}</CText>
            </View>
          ))}
          {todaySummaryRecords.todos.map((todo) => (
            <View key={todo.id} style={[styles.summaryItemBox, {backgroundColor: THEME.bg}]}>
              <CText fontScale={appFontScale} style={{fontSize: 16, marginRight: 10, color: todo.category?.color || THEME.main}}>{todo.done ? '🌸' : '⚪️'}</CText>
              <CText fontScale={appFontScale} style={[styles.summaryItemText, {color: THEME.text}, todo.done && {textDecorationLine: 'line-through', color: THEME.textDim}]}>{todo.text}</CText>
            </View>
          ))}
          
          {todaySummaryRecords.diary ? (
            <View style={[styles.summaryDiaryBox, {backgroundColor: THEME.doneBg}]}>
              <Markdown style={markdownStyles}>
                {todaySummaryRecords.diary}
              </Markdown>
            </View>
          ) : null}

          {todaySummaryRecords.photos && todaySummaryRecords.photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 15, marginBottom: 15}}>
              {todaySummaryRecords.photos.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={{width: 250, height: 250, borderRadius: 15, marginRight: 10}} resizeMode="contain" />
              ))}
            </ScrollView>
          )}
        </ScrollView>

        <View style={styles.bottomTabBar}>
          <TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.tabBtn}>
            <CText fontScale={appFontScale} style={{fontSize: 24}}>⚙️</CText>
            <CText fontScale={appFontScale} style={{fontSize: 10, color: THEME.textDim}}>설정</CText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabBtn}>
            <CText fontScale={appFontScale} style={{fontSize: 24}}>📅</CText>
            <CText fontScale={appFontScale} style={{fontSize: 10, color: THEME.main, fontWeight: 'bold'}}>메인</CText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTodoModalVisible(true)} style={styles.tabBtn}>
            <CText fontScale={appFontScale} style={{fontSize: 24}}>📋</CText>
            <CText fontScale={appFontScale} style={{fontSize: 10, color: THEME.textDim}}>모아보기</CText>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={isSettingsVisible} animationType="fade" transparent={true}>
        <View style={styles.editorOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1, justifyContent: 'center'}}>
            <View style={[styles.editorBox, {backgroundColor: THEME.bgModal}]}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15}}>
                <CText fontScale={appFontScale} style={[styles.editorTitle, {color: THEME.text}]}>앱 설정 ⚙️</CText>
                <TouchableOpacity onPress={() => setSettingsVisible(false)}><CText fontScale={appFontScale} style={{fontSize: 20}}>❌</CText></TouchableOpacity>
              </View>

              <ScrollView style={{maxHeight: height * 0.7}} showsVerticalScrollIndicator={false}>
                <CText fontScale={appFontScale} style={{fontWeight: 'bold', color: THEME.text, marginBottom: 10}}>🎮 계정 연동 (GitHub / Riot)</CText>
                <CTextInput fontScale={appFontScale} style={[styles.editorInput, {marginBottom: 10}]} placeholder="GitHub 아이디 (예: octocat)" value={githubId} onChangeText={setGithubId} />
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15}}>
                  <CTextInput fontScale={appFontScale} style={[styles.editorInput, {flex: 0.65, marginRight: 10}]} placeholder="라이엇 닉네임 (예: Hide on bush)" value={riotName} onChangeText={setRiotName} />
                  <CTextInput fontScale={appFontScale} style={[styles.editorInput, {flex: 0.35}]} placeholder="태그 (예: KR1)" value={riotTag} onChangeText={setRiotTag} />
                </View>

                <CText fontScale={appFontScale} style={{fontWeight: 'bold', color: THEME.text, marginBottom: 10}}>👀 통계 표시 설정</CText>
                <View style={styles.switchRow}><CText fontScale={appFontScale}>🐙 GitHub 잔디</CText><Switch value={showGithub} onValueChange={setShowGithub} /></View>
                <View style={styles.switchRow}><CText fontScale={appFontScale}>🔫 Valorant 티어</CText><Switch value={showValorant} onValueChange={setShowValorant} /></View>
                <View style={styles.switchRow}><CText fontScale={appFontScale}>⚔️ LoL 티어</CText><Switch value={showLol} onValueChange={setShowLol} /></View>
                <View style={styles.switchRow}><CText fontScale={appFontScale}>♟️ TFT 티어</CText><Switch value={showTft} onValueChange={setShowTft} /></View>

                <CText fontScale={appFontScale} style={{fontWeight: 'bold', color: THEME.text, marginTop: 15, marginBottom: 10}}>🔍 글씨 크기</CText>
                <View style={{flexDirection: 'row', marginBottom: 20}}>
                  {[{label: '작게', scale: 0.85}, {label: '보통', scale: 1.0}, {label: '크게', scale: 1.15}].map(opt => (
                    <TouchableOpacity key={opt.label} onPress={() => setAppFontScale(opt.scale)} style={[styles.typeChip, {backgroundColor: THEME.bg, borderColor: '#eee'}, appFontScale === opt.scale && {backgroundColor: THEME.main, borderColor: THEME.main}]}>
                      <CText fontScale={appFontScale} style={[styles.typeChipText, {color: THEME.textDim}, appFontScale === opt.scale && {color: 'white'}]}>{opt.label}</CText>
                    </TouchableOpacity>
                  ))}
                </View>

                <CText fontScale={appFontScale} style={{fontWeight: 'bold', color: THEME.text, marginBottom: 15}}>🎨 테마 색상 (Pantone)</CText>
                <View style={{flexDirection: 'row', justifyContent: 'space-around', marginBottom: 25}}>
                  {Object.keys(PALETTES).map(themeKey => (
                    <TouchableOpacity key={themeKey} onPress={() => setAppTheme(themeKey)} 
                      style={{ width: 45, height: 45, borderRadius: 22.5, backgroundColor: PALETTES[themeKey].main, borderWidth: appTheme === themeKey ? 3 : 0, borderColor: THEME.text }} 
                    />
                  ))}
                </View>

                <TouchableOpacity style={[styles.saveButton, {backgroundColor: THEME.main}]} onPress={saveSettings}>
                  <CText fontScale={appFontScale} style={styles.saveButtonText}>설정 저장하기</CText>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={isTodoModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: THEME.bgModal }}>
          <LinearGradient colors={[`${THEME.main}10`, THEME.bgModal]} style={styles.modalBgGradient}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInner}>
                <CText fontScale={appFontScale} style={[styles.modalTitle, {color: THEME.text}]}>데이터 모아보기 📊</CText>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <TouchableOpacity style={[styles.saveButton, {backgroundColor: THEME.main, width: 80}]} onPress={() => setTodoModalVisible(false)}>
                    <CText fontScale={appFontScale} style={styles.saveButtonText}>닫기</CText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
              
              <CText fontScale={appFontScale} style={[styles.sectionTitle, {color: THEME.text, marginBottom: 15}]}>📈 최근 기록 변화</CText>
              
              {chartLabels.length < 2 ? (
                <View style={styles.emptyGraphBox}>
                  <CText fontScale={appFontScale} style={{color: THEME.textDim, textAlign: 'center', lineHeight: 22}}>
                    최소 2일 이상의 다이어리를 저장해야 꺾은선 그래프가 그려집니다.{"\n"}(현재 저장된 기록: {chartLabels.length}일)
                  </CText>
                </View>
              ) : (
                <View style={{marginBottom: 20}}>
                  {showGithub && (
                    <View style={styles.chartContainer}>
                      <CText fontScale={appFontScale} style={styles.chartTitle}>🐙 GitHub 커밋 수</CText>
                      <LineChart
                        data={{ labels: chartLabels, datasets: [{ data: graphDates.map(d => records[d].apiStats?.github?.commits || 0) }] }}
                        width={width - 40} height={220}
                        yAxisSuffix="개"
                        chartConfig={{ backgroundColor: '#24292e', backgroundGradientFrom: '#24292e', backgroundGradientTo: '#1b1f23', decimalPlaces: 0, color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
                        bezier style={{ borderRadius: 16 }}
                      />
                    </View>
                  )}
                  {showValorant && (
                    <View style={styles.chartContainer}>
                      <CText fontScale={appFontScale} style={styles.chartTitle}>🔫 발로란트 RR 변화</CText>
                      <LineChart
                        data={{ labels: chartLabels, datasets: [{ data: graphDates.map(d => records[d].apiStats?.valorant?.rr || 0) }] }}
                        width={width - 40} height={220}
                        yAxisSuffix=" RR"
                        chartConfig={{ backgroundColor: '#ff4655', backgroundGradientFrom: '#ff4655', backgroundGradientTo: '#d63447', decimalPlaces: 0, color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
                        bezier style={{ borderRadius: 16 }}
                      />
                    </View>
                  )}
                  {showLol && (
                    <View style={styles.chartContainer}>
                      <CText fontScale={appFontScale} style={styles.chartTitle}>⚔️ LoL LP 변화</CText>
                      <LineChart
                        data={{ labels: chartLabels, datasets: [{ data: graphDates.map(d => records[d].apiStats?.lol?.lp || 0) }] }}
                        width={width - 40} height={220}
                        yAxisSuffix=" LP"
                        chartConfig={{ backgroundColor: '#0bc6e3', backgroundGradientFrom: '#0bc6e3', backgroundGradientTo: '#09a4bb', decimalPlaces: 0, color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
                        bezier style={{ borderRadius: 16 }}
                      />
                    </View>
                  )}
                  {showTft && (
                    <View style={styles.chartContainer}>
                      <CText fontScale={appFontScale} style={styles.chartTitle}>♟️ TFT LP 변화</CText>
                      <LineChart
                        data={{ labels: chartLabels, datasets: [{ data: graphDates.map(d => records[d].apiStats?.tft?.lp || 0) }] }}
                        width={width - 40} height={220}
                        yAxisSuffix=" LP"
                        chartConfig={{ backgroundColor: '#e6a822', backgroundGradientFrom: '#e6a822', backgroundGradientTo: '#c7911b', decimalPlaces: 0, color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
                        bezier style={{ borderRadius: 16 }}
                      />
                    </View>
                  )}
                </View>
              )}

              <CText fontScale={appFontScale} style={[styles.sectionTitle, {color: THEME.text, marginBottom: 15, marginTop: 10}]}>📋 할 일 달성 기록</CText>
              <View style={{paddingHorizontal: 5, marginBottom: 15}}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row'}}>
                  <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCollectionFilter('ALL'); }} style={[styles.filterChip, collectionFilter === 'ALL' && {backgroundColor: THEME.text}]}>
                    <CText fontScale={appFontScale} style={[styles.filterChipText, collectionFilter === 'ALL' && {color: 'white'}]}>전체 보기</CText>
                  </TouchableOpacity>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat.id} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCollectionFilter(cat.id); }} style={[styles.filterChip, collectionFilter === cat.id && {backgroundColor: cat.color, borderColor: cat.color}]}>
                      <CText fontScale={appFontScale} style={[styles.filterChipText, collectionFilter === cat.id && {color: 'white'}]}>{cat.name}</CText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {filteredDatesWithTodos.map(date => {
                const displayTodos = collectionFilter === 'ALL' ? records[date].todos : records[date].todos.filter(t => t.category && t.category.id === collectionFilter);
                if (displayTodos.length === 0) return null;
                return (
                  <View key={date} style={{marginBottom: 25}}>
                    <CText fontScale={appFontScale} style={{fontSize: 18, fontWeight: '900', color: THEME.main, marginBottom: 10}}>{date.replace(/-/g, ' / ')}</CText>
                    {displayTodos.map(todo => (
                      <View key={todo.id} style={[styles.todoItemRow, {backgroundColor: THEME.bgModal, borderLeftColor: todo.category?.color || THEME.main, padding: 12}]}>
                        <TouchableOpacity onPress={() => toggleGlobalTodo(date, todo.id)} style={styles.todoCheckArea}>
                          <View style={[styles.stickerCheck, todo.done && {backgroundColor: todo.category?.color || THEME.main, borderColor: 'white'}, {width: 26, height: 26, borderRadius: 13}]}>
                            {todo.done && <CText fontScale={appFontScale} style={[styles.stickerCheckIcon, {fontSize: 12}]}>🎀</CText>}
                          </View>
                        </TouchableOpacity>
                        <CText fontScale={appFontScale} style={[styles.todoText, {color: THEME.text}, todo.done && {textDecorationLine: 'line-through', color: THEME.textDim}]}>{todo.text}</CText>
                      </View>
                    ))}
                  </View>
                )
              })}
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={isMonthPickerVisible} transparent={true} animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity style={{flex: 1}} onPress={() => setMonthPickerVisible(false)} />
          <View style={[styles.bottomSheetContainer, {backgroundColor: THEME.bgModal}]}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.pickerYearRow}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setPickerYear(y => y - 1)}><CText fontScale={appFontScale} style={[styles.arrowText, {color: THEME.main}]}>◀</CText></TouchableOpacity>
              <CText fontScale={appFontScale} style={[styles.pickerYearText, {color: THEME.text}]}>{pickerYear}년</CText>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setPickerYear(y => y + 1)}><CText fontScale={appFontScale} style={[styles.arrowText, {color: THEME.main}]}>▶</CText></TouchableOpacity>
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

      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={saveAndClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: THEME.bgModal }}>
          <LinearGradient colors={[`${THEME.main}10`, THEME.bgModal]} style={styles.modalBgGradient}>
            <View {...panResponder.panHandlers} style={styles.modalHeader}>
              <View style={styles.swipeIndicator} />
              <View style={styles.modalHeaderInner}>
                <CText fontScale={appFontScale} style={[styles.modalTitle, {color: THEME.text}]}>{selectedDate}</CText>
                <TouchableOpacity style={[styles.saveButton, {backgroundColor: THEME.main, width: 80}]} onPress={saveAndClose}>
                  <CText fontScale={appFontScale} style={styles.saveButtonText}>저장</CText>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}>
              
              {(showGithub || showValorant || showLol || showTft) && (
                <>
                  <CText fontScale={appFontScale} style={[styles.sectionTitle, {marginTop: 5, marginBottom: 10, color: THEME.text}]}>🎮 오늘의 데브 & 랭크 기록</CText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20, paddingBottom: 5}}>
                    {visibleStats.map((stat) => (
                      <View key={stat.id} style={[styles.statCard, {backgroundColor: stat.bg}]}>
                        <CText fontScale={appFontScale} style={styles.statCardTitle}>{stat.title}</CText>
                        <CText fontScale={appFontScale} style={styles.statCardDesc}>{stat.desc}</CText>
                        <CText fontScale={appFontScale} style={styles.statCardSub}>{stat.sub}</CText>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}

              <View style={styles.todayEventBox}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                  <CText fontScale={appFontScale} style={[styles.sectionTitle, {color: THEME.text}]}>✨ 캘린더 일정</CText>
                  <TouchableOpacity onPress={() => openEventEditor()}><CText fontScale={appFontScale} style={{color: THEME.main, fontWeight: 'bold'}}>+ 일정 추가</CText></TouchableOpacity>
                </View>
                {todaySummaryEvents.map((ev, idx) => (
                  <View key={idx} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                    <View style={[styles.tagBadge, { backgroundColor: ev.color + '20' }]}><CText fontScale={appFontScale} style={{color: ev.color, fontWeight: 'bold'}}>{ev.title}</CText></View>
                    <TouchableOpacity onPress={() => openEventEditor(ev)} style={{marginLeft: 10}}><CText fontScale={appFontScale}>✏️</CText></TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteEvent(ev.id)} style={{marginLeft: 10}}><CText fontScale={appFontScale}>❌</CText></TouchableOpacity>
                  </View>
                ))}
              </View>

              <CText fontScale={appFontScale} style={[styles.sectionTitle, {color: THEME.text, marginTop: 10, marginBottom: 10}]}>⚡ 루틴 추가</CText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routineScroll}>
                {customRoutines.map((routine) => (
                  <TouchableOpacity key={routine.id} style={[styles.routineChip, {backgroundColor: THEME.bgModal}, currentTodos.some(t => t.routineId === routine.id) && {backgroundColor: THEME.main}]} onPress={() => toggleRoutine(routine)}>
                    <CText fontScale={appFontScale} style={[styles.routineChipText, {color: THEME.text}, currentTodos.some(t => t.routineId === routine.id) && {color: 'white'}]}>{routine.icon} {routine.title}</CText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <CText fontScale={appFontScale} style={[styles.sectionTitle, {color: THEME.text}]}>✅ 할 일 (투두)</CText>
              <View style={{marginBottom: 10}}><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row'}}>{CATEGORIES.map(cat => (
                <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat)} style={[styles.filterChip, selectedCategory.id === cat.id && {backgroundColor: cat.color, borderColor: cat.color}]}><CText fontScale={appFontScale} style={[styles.filterChipText, selectedCategory.id === cat.id && {color: 'white'}]}>{cat.name}</CText></TouchableOpacity>
              ))}</ScrollView></View>
              <View style={styles.inputRow}><CTextInput fontScale={appFontScale} style={[styles.inputBox, {backgroundColor: THEME.bgModal, color: THEME.text}]} placeholder={`${selectedCategory.name} 할 일을 입력하세요`} value={newTodoText} onChangeText={setNewTodoText} onSubmitEditing={() => { if(newTodoText) { setCurrentTodos([...currentTodos, { id: Date.now(), text: newTodoText, done: false, category: selectedCategory }]); setNewTodoText(''); } }} /></View>
              {currentTodos.map((todo) => (
                <View key={todo.id} style={[styles.todoItemRow, {backgroundColor: THEME.bgModal, borderLeftColor: todo.category?.color || THEME.main}]}>
                  <TouchableOpacity onPress={() => setCurrentTodos(currentTodos.map(x => x.id === todo.id ? {...x, done: !x.done} : x))} style={styles.todoCheckArea}><View style={[styles.stickerCheck, todo.done && {backgroundColor: todo.category?.color || THEME.main, borderColor: 'white'}]}>{todo.done && <CText fontScale={appFontScale} style={styles.stickerCheckIcon}>🎀</CText>}</View></TouchableOpacity>
                  <CText fontScale={appFontScale} style={[styles.todoText, {color: THEME.text}, todo.done && {textDecorationLine: 'line-through', color: THEME.textDim}]}>{todo.text}</CText>
                  <TouchableOpacity onPress={() => setCurrentTodos(currentTodos.filter(t => t.id !== todo.id))} style={styles.todoDelete}><CText fontScale={appFontScale}>❌</CText></TouchableOpacity>
                </View>
              ))}

              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25}}>
                <CText fontScale={appFontScale} style={[styles.sectionTitle, {marginTop: 0, color: THEME.text}]}>📖 다이어리</CText>
                <TouchableOpacity onPress={() => setIsDiaryPreview(!isDiaryPreview)}>
                  <CText fontScale={appFontScale} style={{color: THEME.main, fontWeight: 'bold'}}>{isDiaryPreview ? '✏️ 수정하기' : '👀 미리보기'}</CText>
                </TouchableOpacity>
              </View>

              {isDiaryPreview ? (
                <View style={[styles.diaryInputContainer, { flex: 1, backgroundColor: THEME.diaryBg, borderColor: THEME.diaryBorder, padding: 20 }]}>
                  <Markdown style={markdownStyles}>
                    {currentDiary || '작성된 내용이 없습니다.'}
                  </Markdown>
                </View>
              ) : (
                <View style={[styles.diaryInputContainer, { flex: 1, backgroundColor: THEME.diaryBg, borderColor: THEME.diaryBorder }]}>
                  <CTextInput fontScale={appFontScale} style={[styles.diaryInput, {color: THEME.text}]} placeholder="노션처럼 마크다운으로 기록해보세요! (예: **굵게**, - 리스트)" multiline={true} value={currentDiary} onChangeText={setCurrentDiary} />
                </View>
              )}

              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 10}}>
                <CText fontScale={appFontScale} style={[styles.sectionTitle, {marginBottom: 0, marginTop: 0, color: THEME.text}]}>📸 사진 기록</CText>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}}>
                {currentPhotos.map((uri, index) => (
                  <View key={index} style={{marginRight: 10, position: 'relative'}}>
                    <Image source={{ uri }} style={{width: 250, height: 250, borderRadius: 15}} resizeMode="contain" />
                    <TouchableOpacity style={styles.photoDeleteBtn} onPress={() => setCurrentPhotos(prev => prev.filter((_, i) => i !== index))}>
                      <Text style={{color:'white', fontWeight:'bold'}}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={[styles.emptyPhotoBox, {width: currentPhotos.length > 0 ? 100 : width - 50}]} onPress={pickImage}>
                  <CText fontScale={appFontScale} style={{color: THEME.textDim, fontSize: currentPhotos.length > 0 ? 30 : 14}}>
                    {currentPhotos.length > 0 ? '+' : '여러 장의 사진을 선택해서 추가해보세요 📸'}
                  </CText>
                </TouchableOpacity>
              </ScrollView>

            </ScrollView>

            {isEventEditorVisible && (
              <View style={[styles.editorOverlay, {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999}]}>
                <View style={[styles.editorBox, {backgroundColor: THEME.bgModal}]}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
                    <CText fontScale={appFontScale} style={[styles.editorTitle, {color: THEME.text}]}>일정 추가 📅</CText>
                    <TouchableOpacity onPress={() => setEventEditorVisible(false)}><CText fontScale={appFontScale} style={{fontSize: 20}}>❌</CText></TouchableOpacity>
                  </View>
                  <CTextInput fontScale={appFontScale} style={[styles.editorInput, {marginBottom: 15}]} placeholder="일정 이름" value={eventTitle} onChangeText={setEventTitle} />
                  
                  <View style={styles.typeSelectorRow}>
                    {[{t:'once',l:'한 번'}, {t:'daily',l:'매일'}, {t:'weekly',l:'매주'}, {t:'monthly',l:'매월'}, {t:'yearly',l:'매년'}, {t:'interval',l:'N일 간격'}].map(o => (
                      <TouchableOpacity key={o.t} onPress={() => setEventType(o.t)} style={[styles.typeChip, {backgroundColor: THEME.bg}, eventType === o.t && {backgroundColor: THEME.main, borderColor: THEME.main}]}>
                        <CText fontScale={appFontScale} style={[styles.typeChipText, {color: THEME.textDim}, eventType === o.t && {color: 'white'}]}>{o.l}</CText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {eventType === 'interval' && (
                    <CTextInput fontScale={appFontScale} style={[styles.editorInput, {marginBottom: 15}]} keyboardType="numeric" placeholder="며칠마다 반복할까요? (예: 3)" value={eventInterval} onChangeText={setEventInterval} />
                  )}

                  <TouchableOpacity style={[styles.saveButton, {backgroundColor: THEME.main, marginTop: 10}]} onPress={saveEvent}>
                    <CText fontScale={appFontScale} style={styles.saveButtonText}>저장하기</CText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
  diaryInputContainer: { borderRadius: 20, overflow: 'hidden', marginTop: 10, borderWidth: 1, minHeight: 200 },
  diaryInput: { flex: 1, padding: 20, textAlignVertical: 'top', fontSize: 16, lineHeight: 26 },
  editorOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  editorBox: { padding: 25, borderRadius: 25 },
  editorTitle: { fontSize: 20, fontWeight: 'bold' },
  editorInput: { borderWidth: 1, borderColor: '#eee', borderRadius: 15, padding: 15, fontSize: 15 },
  editorRoutineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  typeSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15, justifyContent: 'center' },
  typeChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#eee', margin: 4 },
  typeChipText: { fontWeight: '600', fontSize: 13 },
  bottomTabBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 10 },
  tabBtn: { alignItems: 'center' },
  emptyPhotoBox: { backgroundColor: '#f9f9f9', borderRadius: 15, height: 250, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderStyle: 'dashed', marginBottom: 15 },
  photoDeleteBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  statCard: { width: 150, padding: 15, borderRadius: 20, marginRight: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  statCardTitle: { color: 'white', fontWeight: '900', fontSize: 16, marginBottom: 8 },
  statCardDesc: { color: 'white', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  statCardSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  emptyGraphBox: { padding: 30, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 20, alignItems: 'center', marginBottom: 20 },
  chartContainer: { marginBottom: 20 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#5B4D4D', marginBottom: 8, marginLeft: 5 }
});