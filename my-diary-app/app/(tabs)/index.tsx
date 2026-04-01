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
import * as DeviceCalendar from 'expo-calendar';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

const SERVER_IP = '172.30.158.82'; // ⭐️ 본인 PC의 실제 내부 IP로 꼭 변경하세요!

SplashScreen.preventAutoHideAsync();

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PALETTES = {
  peach: { name: '피치 퍼즈', bg: '#FFF9F5', bgModal: '#FFFFFF', main: '#FFBE98', accent: '#FADCB9', text: '#5B4D4D', textDim: '#B4A7A7', holiday: '#FF7675', saturday: '#74B9FF', doneBg: '#FFF0F0', doneCheck: '#FFBE98', diaryBg: '#FFF6F0', diaryBorder: '#FFE8D6', progressBar: '#FFBE98' },
  blue: { name: '클래식 블루', bg: '#F0F4F8', bgModal: '#FFFFFF', main: '#0F4C81', accent: '#8CB1DF', text: '#2C3E50', textDim: '#829AB1', holiday: '#E63946', saturday: '#0984E3', doneBg: '#E1E8ED', doneCheck: '#0F4C81', diaryBg: '#F8FAFC', diaryBorder: '#D9E2EC', progressBar: '#0F4C81' },
  green: { name: '그리너리', bg: '#F6FFF8', bgModal: '#FFFFFF', main: '#88B04B', accent: '#D4E157', text: '#3D5A80', textDim: '#95A5A6', holiday: '#E07A5F', saturday: '#3D5A80', doneBg: '#E8F5E9', doneCheck: '#88B04B', diaryBg: '#F1FAEE', diaryBorder: '#D8E2DC', progressBar: '#88B04B' },
  peri: { name: '베리 페리', bg: '#F8F5FA', bgModal: '#FFFFFF', main: '#6667AB', accent: '#B3B3D9', text: '#4A235A', textDim: '#9575CD', holiday: '#FF5252', saturday: '#448AFF', doneBg: '#F3E5F5', doneCheck: '#6667AB', diaryBg: '#FAF8FC', diaryBorder: '#EDE7F6', progressBar: '#6667AB' }
};

const CATEGORIES = [
  { id: 'c1', name: '📝 일상', color: '#FFD3B6' },
  { id: 'c2', name: '💪 운동', color: '#FF9A9E' },
  { id: 'c3', name: '📚 과제', color: '#74B9FF' },
  { id: 'c4', name: '🎮 게임', color: '#ba68c8' }
];

const SOLAR_HOLIDAYS = { '01-01': '신정', '03-01': '3·1절', '05-05': '어린이날', '06-06': '현충일', '08-15': '광복절', '10-03': '개천절', '10-09': '한글날', '12-25': '크리스마스' };
const LUNAR_HOLIDAYS = { '01-01': '설날', '04-08': '부처님오신날', '08-15': '추석' };

const DEFAULT_API_STATS = [
  { id: 'github', title: '🐙 GitHub', desc: '데이터 로딩 중...', sub: '', bg: '#24292e' },
  { id: 'val', title: '🔫 Valorant', desc: '데이터 로딩 중...', sub: '', bg: '#ff4655' },
  { id: 'lol', title: '⚔️ LoL', desc: '데이터 로딩 중...', sub: '', bg: '#0bc6e3' },
  { id: 'tft', title: '♟️ TFT', desc: '데이터 로딩 중...', sub: '', bg: '#e6a822' }
];

const VAL_COLORS = { "Iron": "#737373", "Bronze": "#A55D35", "Silver": "#A6B1B7", "Gold": "#D4AF37", "Platinum": "#37A1A4", "Diamond": "#B483D8", "Ascendant": "#2E8B57", "Immortal": "#DC3545", "Radiant": "#FFF7B0", "Unranked": "#E0E0E0" };
const LOL_COLORS = { "IRON": "#737373", "BRONZE": "#A55D35", "SILVER": "#A6B1B7", "GOLD": "#D4AF37", "PLATINUM": "#40E0D0", "EMERALD": "#28A745", "DIAMOND": "#4169E1", "MASTER": "#8A2BE2", "GRANDMASTER": "#DC3545", "CHALLENGER": "#87CEFA", "Unranked": "#E0E0E0" };

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
  const displayLines = marking?.lines?.slice(0, 4) || []; 

  return (
    <TouchableOpacity 
      style={[
        styles.dayCell, 
        isSelected && {backgroundColor: theme.accent, borderRadius: 8}, 
        isToday && !isSelected && {borderWidth: 2, borderColor: theme.accent, borderRadius: 8}
      ]} 
      onPress={() => onDayPress(date.dateString)}
    >
      <CText fontScale={fontScale} style={[
        styles.dayText, 
        {color: theme.text}, 
        state === 'disabled' ? {color: theme.textDim, opacity: 0.5} : isHoliday || isSunday ? {color: theme.holiday} : isSaturday ? {color: theme.saturday} : null, 
        isSelected && {color: 'white', fontWeight: 'bold'}
      ]}>
        {date.day}
      </CText>
      {isHoliday && <CText fontScale={fontScale} style={[styles.holidayLabel, {color: theme.holiday}]} numberOfLines={1}>{marking.holidayName}</CText>}
      <View style={styles.linesContainer}>
        {displayLines.map((line, i) => <View key={line.key || i} style={[styles.line, { backgroundColor: line.color }]} />)}
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

  const [githubId, setGithubId] = useState('');
  const [riotName, setRiotName] = useState('');
  const [riotTag, setRiotTag] = useState('');
  
  const [showGithub, setShowGithub] = useState(true);
  const [showValorant, setShowValorant] = useState(true);
  const [showLol, setShowLol] = useState(true);
  const [showTft, setShowTft] = useState(true);
  const [showSavings, setShowSavings] = useState(true);
  const [showSystemCalendar, setShowSystemCalendar] = useState(true); 
  const [showTodos, setShowTodos] = useState(true);

  const [wishlistGoalName, setWishlistGoalName] = useState('새 PC 본체 🖥️');
  const [dDayName, setDDayName] = useState('승의💕');
  const [dDayDate, setDDayDate] = useState('2024-01-01');
  const [savingsCurrent, setSavingsCurrent] = useState('3000000'); 
  const [savingsTarget, setSavingsTarget] = useState('500000000');

  const [apiStats, setApiStats] = useState(DEFAULT_API_STATS);
  const [rawApiData, setRawApiData] = useState(null);
  const [systemMonthEvents, setSystemMonthEvents] = useState({}); 

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
  const [gatheringTodoText, setGatheringTodoText] = useState('');
  
  const [currentVoiceMemo, setCurrentVoiceMemo] = useState(null);
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

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

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const savedRecords = await AsyncStorage.getItem('diary_records');
        if (savedRecords) setRecords(JSON.parse(savedRecords));
      } catch (e) {
        console.warn('기록 복구 실패', e);
      }
    };
    loadRecords();
  }, []);

  useEffect(() => {
    const fetchMonthEvents = async () => {
      try {
        const { status } = await DeviceCalendar.requestCalendarPermissionsAsync();
        if (status === 'granted') {
          const calendars = await DeviceCalendar.getCalendarsAsync(DeviceCalendar.EntityTypes.EVENT);
          const calendarIds = calendars.map(c => c.id);
          const [y, m] = displayedMonthName.split('-');
          const start = new Date(parseInt(y), parseInt(m) - 1, 1);
          const end = new Date(parseInt(y), parseInt(m), 0, 23, 59, 59);
          const events = await DeviceCalendar.getEventsAsync(calendarIds, start, end);
          const eventMap = {};
          events.forEach(e => {
            const dateObj = new Date(e.startDate);
            const tzOffset = dateObj.getTimezoneOffset() * 60000;
            const localDate = new Date(dateObj.getTime() - tzOffset);
            const dateStr = localDate.toISOString().split('T')[0];
            if (!eventMap[dateStr]) eventMap[dateStr] = [];
            eventMap[dateStr].push({ id: e.id, title: e.title, color: e.color || THEME.main, isSystem: true });
          });
          setSystemMonthEvents(eventMap);
        }
      } catch (e) { console.log('캘린더 연동 에러:', e); }
    };
    fetchMonthEvents();
  }, [displayedMonthName, THEME.main]);

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
        const sSavShow = await AsyncStorage.getItem('showSavings');
        const sSysCal = await AsyncStorage.getItem('showSystemCalendar'); 
        const sTodos = await AsyncStorage.getItem('showTodos');
        
        const sGoalName = await AsyncStorage.getItem('wishlistGoalName'); 
        const sDDayName = await AsyncStorage.getItem('dDayName');
        const sDDayDate = await AsyncStorage.getItem('dDayDate');
        const sSavCur = await AsyncStorage.getItem('savingsCurrent');
        const sSavTar = await AsyncStorage.getItem('savingsTarget');

        if (storedGithub) setGithubId(storedGithub);
        if (storedRiotName) setRiotName(storedRiotName);
        if (storedRiotTag) setRiotTag(storedRiotTag);
        if (sGh !== null) setShowGithub(JSON.parse(sGh));
        if (sVal !== null) setShowValorant(JSON.parse(sVal));
        if (sLol !== null) setShowLol(JSON.parse(sLol));
        if (sTft !== null) setShowTft(JSON.parse(sTft));
        if (sSavShow !== null) setShowSavings(JSON.parse(sSavShow));
        if (sSysCal !== null) setShowSystemCalendar(JSON.parse(sSysCal));
        if (sTodos !== null) setShowTodos(JSON.parse(sTodos));
        
        if (sGoalName) setWishlistGoalName(sGoalName);
        if (sDDayName) setDDayName(sDDayName);
        if (sDDayDate) setDDayDate(sDDayDate);
        if (sSavCur) setSavingsCurrent(sSavCur);
        if (sSavTar) setSavingsTarget(sSavTar);

        if (storedGithub && storedRiotName && storedRiotTag) {
          fetchBackendStats(storedGithub, storedRiotName, storedRiotTag, selectedDate);
        } else {
          setApiStats([{ id: 'info', title: '⚙️ 설정 필요', desc: '설정에서 계정을 연동해주세요.', sub: '', bg: '#95A5A6' }]);
        }
      } catch (e) { console.warn('설정 로드 실패', e); }
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
      setApiStats([{ id: 'offline', title: '📴 오프라인 모드', desc: '인터넷 연결 끊김', sub: '로컬 모드 작동 중', bg: '#95A5A6' }]);
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
    await AsyncStorage.setItem('showSavings', JSON.stringify(showSavings));
    await AsyncStorage.setItem('showSystemCalendar', JSON.stringify(showSystemCalendar)); 
    await AsyncStorage.setItem('showTodos', JSON.stringify(showTodos)); 
    
    await AsyncStorage.setItem('wishlistGoalName', wishlistGoalName);
    await AsyncStorage.setItem('dDayName', dDayName);
    await AsyncStorage.setItem('dDayDate', dDayDate);
    await AsyncStorage.setItem('savingsCurrent', savingsCurrent);
    await AsyncStorage.setItem('savingsTarget', savingsTarget);

    setSettingsVisible(false);
    fetchBackendStats(githubId, riotName, riotTag, selectedDate);
  };

  const saveAndClose = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const todayStr = new Date().toISOString().split('T')[0];

    setRecords(prev => {
      let newApiStats = prev[selectedDate]?.apiStats || null;
      if (selectedDate === todayStr) {
        newApiStats = rawApiData; 
      }
      const newRecords = {
        ...prev,
        [selectedDate]: {
          diary: currentDiary,
          todos: currentTodos,
          photos: currentPhotos,
          apiStats: newApiStats,
          voiceMemo: currentVoiceMemo 
        }
      };
      AsyncStorage.setItem('diary_records', JSON.stringify(newRecords));
      return newRecords;
    });
    setIsDiaryPreview(false);
    setModalVisible(false);
  }, [selectedDate, currentDiary, currentTodos, currentPhotos, rawApiData, currentVoiceMemo]);

  const addGatheringTodo = () => {
    if (!gatheringTodoText.trim()) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const todayStr = new Date().toISOString().split('T')[0];
    
    setRecords(prev => {
      const prevDateRecord = prev[todayStr] || { todos: [], diary: '', photos: [] };
      const newTodo = { id: Date.now(), text: gatheringTodoText, done: false, category: CATEGORIES[0] };
      const updatedTodos = [...(prevDateRecord.todos || []), newTodo];
      
      const newRecords = { ...prev, [todayStr]: { ...prevDateRecord, todos: updatedTodos } };
      AsyncStorage.setItem('diary_records', JSON.stringify(newRecords));
      
      if (selectedDate === todayStr) setCurrentTodos(updatedTodos);
      return newRecords;
    });
    setGatheringTodoText('');
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderRelease: (evt, gestureState) => { if (gestureState.dy > 50) saveAndClose(); },
  })).current;

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(recording);
        setIsRecording(true);
      }
    } catch (err) { console.error('녹음 실패:', err); }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    setCurrentVoiceMemo(uri);
    setRecording(null);
  };

  const playVoiceMemo = async () => {
    if (!currentVoiceMemo) return;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: currentVoiceMemo });
      setSound(sound);
      await sound.playAsync();
    } catch (e) { console.log('재생 에러', e); }
  };

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

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

  const deleteEvent = async (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRecurringEvents(recurringEvents.filter(e => e.id !== id));
  };

  const openEventEditor = (event = null) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
    let newEvent = { id: editingEventId || 'ev_' + Date.now(), title: eventTitle, type: eventType, color: THEME.main };
    
    if (eventType === 'once') { newEvent.date = selectedDate; }
    else if (eventType === 'daily') { newEvent.startDate = selectedDate; }
    else if (eventType === 'yearly') { newEvent.month = m; newEvent.day = d; }
    else if (eventType === 'monthly') { newEvent.day = d; }
    else if (eventType === 'weekly') { newEvent.dayOfWeek = dateObj.getDay(); }
    else if (eventType === 'interval') { newEvent.interval = parseInt(eventInterval) || 1; newEvent.startDate = selectedDate; }
    
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
      
      if (showSystemCalendar && systemMonthEvents[dateStr]) {
        systemMonthEvents[dateStr].forEach(e => { marks[dateStr].lines.push({ key: e.id, color: e.color }); });
      }
    }
    Object.keys(records).forEach(date => {
      if (!marks[date]) marks[date] = { lines: [] };
      if (records[date].diary || (records[date].todos && records[date].todos.length > 0) || (records[date].photos && records[date].photos.length > 0)) {
        if(!marks[date].lines.find(l => l.key === 'record')) marks[date].lines.push({ key: 'record', color: THEME.textDim });
      }
    });
    return marks;
  }, [displayedYear, getRecurringEventsForDate, records, THEME, systemMonthEvents, showSystemCalendar]);

  const markedDates = useMemo(() => {
    return { ...baseMarks, [selectedDate]: { ...(baseMarks[selectedDate] || {lines:[]}), selected: true } };
  }, [baseMarks, selectedDate]);

  const handleDayPress = useCallback((dateString) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selectedDate === dateString) {
      if (records[dateString]) { 
        setCurrentDiary(records[dateString].diary || ''); 
        setCurrentTodos(records[dateString].todos || []); 
        setCurrentPhotos(records[dateString].photos || []); 
        setCurrentVoiceMemo(records[dateString].voiceMemo || null);
      } else { 
        setCurrentDiary(''); setCurrentTodos([]); setCurrentPhotos([]); setCurrentVoiceMemo(null);
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
  
  const sysEventsForToday = showSystemCalendar ? (systemMonthEvents[selectedDate] || []) : [];
  const combinedEvents = [...sysEventsForToday, ...todaySummaryEvents];
  const todaySummaryRecords = records[selectedDate] || { todos: [], diary: '', photos: [] };

  const filteredDatesWithTodos = useMemo(() => {
    return Object.keys(records).filter(date => {
      const todos = records[date].todos || [];
      if (todos.length === 0) return false;
      if (collectionFilter === 'ALL') return true;
      return todos.some(t => t.category && t.category.id === collectionFilter);
    }).sort((a,b) => b.localeCompare(a));
  }, [records, collectionFilter]);

  const processGitData = useMemo(() => {
    let data = [];
    Object.keys(records).sort().forEach(d => {
      const commits = records[d].apiStats?.github?.commits || 0;
      if (commits > 0) data.push({ date: d.substring(5).replace('-', '/'), val: commits });
    });
    return data.slice(-10);
  }, [records]);

  const processValData = useMemo(() => {
    let last = null; let data = [];
    Object.keys(records).sort().forEach(d => {
      const stat = records[d].apiStats?.valorant;
      if (!stat || stat.rank === 'Unranked' || !stat.rank) return;
      const currentStr = `${stat.rank} ${stat.rr}`;
      if (currentStr !== last) {
        const tierBase = stat.rank.split(' ')[0];
        data.push({ date: d.substring(5).replace('-', '/'), label: stat.rank, val: stat.rr, color: VAL_COLORS[tierBase] || '#ccc' });
        last = currentStr;
      }
    });
    return data.slice(-10);
  }, [records]);

  const processLolData = useMemo(() => {
    let last = null; let data = [];
    Object.keys(records).sort().forEach(d => {
      const stat = records[d].apiStats?.lol;
      if (!stat || stat.tier === 'Unranked' || !stat.tier) return;
      const currentStr = `${stat.tier} ${stat.lp}`;
      if (currentStr !== last) {
        const tierBase = stat.tier.split(' ')[0].toUpperCase();
        data.push({ date: d.substring(5).replace('-', '/'), label: stat.tier, val: stat.lp, color: LOL_COLORS[tierBase] || '#ccc' });
        last = currentStr;
      }
    });
    return data.slice(-10);
  }, [records]);

  const processTftData = useMemo(() => {
    let last = null; let data = [];
    Object.keys(records).sort().forEach(d => {
      const stat = records[d].apiStats?.tft;
      if (!stat || stat.tier === 'Unranked' || !stat.tier) return;
      const currentStr = `${stat.tier} ${stat.lp}`;
      if (currentStr !== last) {
        const tierBase = stat.tier.split(' ')[0].toUpperCase();
        data.push({ date: d.substring(5).replace('-', '/'), label: stat.tier, val: stat.lp, color: LOL_COLORS[tierBase] || '#ccc' });
        last = currentStr;
      }
    });
    return data.slice(-10);
  }, [records]);

  const getDDay = () => {
    if (!dDayDate) return 0;
    const diffTime = new Date().getTime() - new Date(dDayDate).getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; 
  };

  const getSavingsPercent = () => {
    const cur = parseInt(savingsCurrent) || 0;
    const tar = parseInt(savingsTarget) || 1;
    let percent = (cur / tar) * 100;
    return (percent > 100 ? 100 : percent).toFixed(1);
  };

  if (!fontsLoaded) return null;

  return (
    <View style={[styles.container, {backgroundColor: THEME.bg}]}>
      <StatusBar barStyle="dark-content" />
      
      {/* ⭐️ 강제 끌어올림(paddingTop 10) + D-Day 위치 Absolute 조정으로 세모 꺾임 완벽 방지 */}
      <View style={[styles.calendarArea, {backgroundColor: THEME.bg}]}>
        <View style={styles.floatingHeader}>
          <View style={styles.dDayBadgeContainer}>
             <View style={styles.dDayBadge}>
               <CText fontScale={appFontScale} style={{fontWeight: 'bold', color: THEME.main, fontSize: 12}}>{dDayName} +{getDDay()}일</CText>
             </View>
          </View>
          
          {/* ⭐️ flexWrap: 'nowrap' 으로 무조건 한 줄에 나오도록 강제 */}
          <TouchableOpacity style={styles.headerButton} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setPickerYear(displayedYear); setMonthPickerVisible(true); }}>
            <CText fontScale={appFontScale} style={[styles.headerTitle, {color: THEME.text}]} numberOfLines={1}>{displayedMonthName.split('-')[0]}년 {parseInt(displayedMonthName.split('-')[1])}월 ▼</CText>
          </TouchableOpacity>
        </View>

        <Calendar
          key={calendarKey} 
          initialDate={calendarMonth} 
          hideExtraDays={true} 
          onMonthChange={(m) => { 
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setDisplayedMonthName(m.dateString.substring(0, 7)); 
          }}
          dayComponent={renderDay} markedDates={markedDates} hideArrows={true} enableSwipeMonths={true} renderHeader={() => null} 
          style={styles.calendarStyle} theme={{ calendarBackground: 'transparent' }}
        />
      </View>

      <View style={[styles.summaryArea, {backgroundColor: THEME.bgModal}]}>
        <LinearGradient colors={[`${THEME.bgModal}00`, THEME.bgModal]} style={styles.summaryGradient} />
        <View style={styles.summaryHeader}>
          <CText fontScale={appFontScale} style={[styles.summaryDateText, {color: THEME.text}]}>{parseInt(sm)}월 {parseInt(sd)}일의 요약</CText>
          <TouchableOpacity onPress={() => handleDayPress(selectedDate)} style={[styles.openDetailBtn, {backgroundColor: THEME.main + '20'}]}>
            <CText fontScale={appFontScale} style={[styles.openDetailBtnText, {color: THEME.main}]}>✏️ 다이어리 열기</CText>
          </TouchableOpacity>
        </View>

        {/* ⭐️ 요약 내용 렌더링 (데브&랭크 제외, 캘린더 일정 먼저) & 하단 쿠션(paddingBottom 60) 추가 */}
        <ScrollView style={styles.summaryContent} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          
          {combinedEvents.length === 0 && todaySummaryRecords.todos.length === 0 && !todaySummaryRecords.diary && todaySummaryRecords.photos?.length === 0 && !todaySummaryRecords.voiceMemo && (
            <View style={styles.emptyStateBox}>
              <CText fontScale={appFontScale} style={{color: THEME.textDim}}>기록된 내용이 없습니다. 다이어리를 열어보세요! ✨</CText>
            </View>
          )}
          
          {combinedEvents.map((ev, idx) => (
            <View key={idx} style={[styles.summaryItemBox, {backgroundColor: THEME.bg}]}>
              <View style={[styles.summaryColorBar, {backgroundColor: ev.color}]} />
              <CText fontScale={appFontScale} style={[styles.summaryItemText, {color: THEME.text}]}>{ev.isSystem ? '📱 ' : '✨ '}{ev.title}</CText>
            </View>
          ))}
          
          {showTodos && todaySummaryRecords.todos.map((todo) => (
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

          {todaySummaryRecords.voiceMemo && (
            <View style={[styles.summaryItemBox, {backgroundColor: THEME.bg, marginTop: 10}]}>
              <CText fontScale={appFontScale} style={{fontSize: 16, marginRight: 10}}>🎙️</CText>
              <CText fontScale={appFontScale} style={[styles.summaryItemText, {color: THEME.textDim}]}>음성 일기가 녹음되어 있습니다.</CText>
            </View>
          )}

          {todaySummaryRecords.photos && todaySummaryRecords.photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 15, marginBottom: 15}}>
              {todaySummaryRecords.photos.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={{width: 250, height: 250, borderRadius: 15, marginRight: 10}} resizeMode="contain" />
              ))}
            </ScrollView>
          )}
        </ScrollView>

        <View style={styles.bottomTabBar}>
          <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSettingsVisible(true); }} style={styles.tabBtn}>
            <CText fontScale={appFontScale} style={{fontSize: 24}}>⚙️</CText>
            <CText fontScale={appFontScale} style={{fontSize: 10, color: THEME.textDim}}>설정</CText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabBtn}>
            <CText fontScale={appFontScale} style={{fontSize: 24}}>📅</CText>
            <CText fontScale={appFontScale} style={{fontSize: 10, color: THEME.main, fontWeight: 'bold'}}>메인</CText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setTodoModalVisible(true); }} style={styles.tabBtn}>
            <CText fontScale={appFontScale} style={{fontSize: 24}}>📋</CText>
            <CText fontScale={appFontScale} style={{fontSize: 10, color: THEME.textDim}}>모아보기</CText>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={isSettingsVisible} animationType="fade" transparent={true}>
        <View style={styles.editorOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1, justifyContent: 'center'}}>
            <View style={[styles.editorBox, {backgroundColor: THEME.bgModal}]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
                  <CText fontScale={appFontScale} style={styles.editorTitle}>설정 및 목표 ⚙️</CText>
                  <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSettingsVisible(false); }}><CText fontScale={appFontScale} style={{fontSize: 20}}>❌</CText></TouchableOpacity>
                </View>

                <CText fontScale={appFontScale} style={styles.settingLabel}>🎮 계정 연동 (GitHub / Riot)</CText>
                <CTextInput fontScale={appFontScale} style={[styles.editorInput, {marginBottom: 10}]} placeholder="GitHub 아이디 (예: octocat)" value={githubId} onChangeText={setGithubId} />
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15}}>
                  <CTextInput fontScale={appFontScale} style={[styles.editorInput, {flex: 0.65, marginRight: 10}]} placeholder="라이엇 닉네임 (예: Hide on bush)" value={riotName} onChangeText={setRiotName} />
                  <CTextInput fontScale={appFontScale} style={[styles.editorInput, {flex: 0.35}]} placeholder="태그 (예: KR1)" value={riotTag} onChangeText={setRiotTag} />
                </View>

                <CText fontScale={appFontScale} style={styles.settingLabel}>💕 기념일(D-Day) 설정</CText>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
                  <CTextInput fontScale={appFontScale} style={[styles.editorInput, {flex: 0.45, marginRight: 10}]} placeholder="애칭" value={dDayName} onChangeText={setDDayName} />
                  <CTextInput fontScale={appFontScale} style={[styles.editorInput, {flex: 0.55}]} placeholder="시작일 (YYYY-MM-DD)" value={dDayDate} onChangeText={setDDayDate} />
                </View>

                <CText fontScale={appFontScale} style={styles.settingLabel}>🛍️ 위시리스트 목표 달성</CText>
                <CTextInput fontScale={appFontScale} style={[styles.editorInput, {marginBottom: 10}]} placeholder="목표 물건 이름 (예: 새 PC 본체)" value={wishlistGoalName} onChangeText={setWishlistGoalName} />
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
                  <CTextInput fontScale={appFontScale} style={[styles.editorInput, {flex: 0.48}]} placeholder="현재 모은 돈" keyboardType="numeric" value={savingsCurrent} onChangeText={setSavingsCurrent} />
                  <CTextInput fontScale={appFontScale} style={[styles.editorInput, {flex: 0.48}]} placeholder="목표 가격" keyboardType="numeric" value={savingsTarget} onChangeText={setSavingsTarget} />
                </View>

                <CText fontScale={appFontScale} style={styles.settingLabel}>👀 표시 토글</CText>
                <View style={styles.switchRow}><CText fontScale={appFontScale}>기본 캘린더 연동 (삼성/구글)</CText><Switch value={showSystemCalendar} onValueChange={setShowSystemCalendar} /></View>
                <View style={styles.switchRow}><CText fontScale={appFontScale}>위시리스트 달성률 표시</CText><Switch value={showSavings} onValueChange={setShowSavings} /></View>
                <View style={styles.switchRow}><CText fontScale={appFontScale}>메인화면 할 일(Todo) 요약</CText><Switch value={showTodos} onValueChange={setShowTodos} /></View>
                <View style={styles.switchRow}><CText fontScale={appFontScale}>GitHub 잔디</CText><Switch value={showGithub} onValueChange={setShowGithub} /></View>
                <View style={styles.switchRow}><CText fontScale={appFontScale}>Valorant 티어</CText><Switch value={showValorant} onValueChange={setShowValorant} /></View>
                <View style={styles.switchRow}><CText fontScale={appFontScale}>LoL 티어</CText><Switch value={showLol} onValueChange={setShowLol} /></View>
                <View style={styles.switchRow}><CText fontScale={appFontScale}>TFT 티어</CText><Switch value={showTft} onValueChange={setShowTft} /></View>

                <CText fontScale={appFontScale} style={[styles.settingLabel, {marginTop: 10}]}>🎨 테마 색상 (Pantone)</CText>
                <View style={{flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20}}>
                  {Object.keys(PALETTES).map(themeKey => (
                    <TouchableOpacity key={themeKey} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setAppTheme(themeKey); }} 
                      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: PALETTES[themeKey].main, borderWidth: appTheme === themeKey ? 3 : 0, borderColor: THEME.text }} 
                    />
                  ))}
                </View>

                <TouchableOpacity style={[styles.saveButton, {backgroundColor: THEME.main}]} onPress={saveSettings}>
                  <CText fontScale={appFontScale} style={styles.saveButtonText}>설정 저장</CText>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={isTodoModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: THEME.bgModal }}>
          <LinearGradient colors={[`${THEME.main}10`, THEME.bgModal]} style={styles.modalBgGradient}>
            
            {/* ⭐️ 모아보기 모달의 상단 패딩은 넉넉하게 60으로 고정해서 잘리지 않게 방어 */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInner}>
                <CText fontScale={appFontScale} style={[styles.modalTitle, {color: THEME.text}]}>데이터 모아보기 📊</CText>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <TouchableOpacity onPress={() => setRoutineEditorVisible(true)} style={{marginRight: 15}}>
                    <CText fontScale={appFontScale} style={{color: THEME.main, fontWeight: 'bold'}}>⚡ 루틴 설정</CText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveButton, {backgroundColor: THEME.main, width: 80}]} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setTodoModalVisible(false); }}>
                    <CText fontScale={appFontScale} style={styles.saveButtonText}>닫기</CText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
              
              <CText fontScale={appFontScale} style={[styles.sectionTitle, {color: THEME.text, marginBottom: 15}]}>📋 할 일 달성 기록</CText>
              
              <View style={styles.quickAddBox}>
                <TextInput style={styles.quickInput} placeholder="오늘의 할 일을 즉시 추가하세요..." value={gatheringTodoText} onChangeText={setGatheringTodoText} />
                <TouchableOpacity style={[styles.addBtn, {backgroundColor: THEME.main}]} onPress={addGatheringTodo}>
                  <Text style={{color:'white', fontSize: 24, fontWeight: 'bold', marginTop: -3}}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={{paddingHorizontal: 5, marginBottom: 15}}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row'}}>
                  <TouchableOpacity onPress={() => setCollectionFilter('ALL')} style={[styles.filterChip, collectionFilter === 'ALL' && {backgroundColor: THEME.text}]}><CText fontScale={appFontScale} style={[styles.filterChipText, collectionFilter === 'ALL' && {color: 'white'}]}>전체</CText></TouchableOpacity>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat.id} onPress={() => setCollectionFilter(cat.id)} style={[styles.filterChip, collectionFilter === cat.id && {backgroundColor: cat.color, borderColor: cat.color}]}><CText fontScale={appFontScale} style={[styles.filterChipText, collectionFilter === cat.id && {color: 'white'}]}>{cat.name}</CText></TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {filteredDatesWithTodos.map(date => {
                const displayTodos = collectionFilter === 'ALL' ? records[date].todos : records[date].todos.filter(t => t.category && t.category.id === collectionFilter);
                if (displayTodos.length === 0) return null;
                return (
                  <View key={date} style={{marginBottom: 20}}>
                    <CText fontScale={appFontScale} style={{fontSize: 16, fontWeight: 'bold', color: THEME.main, marginBottom: 8}}>{date.replace(/-/g, ' / ')}</CText>
                    {displayTodos.map(todo => (
                      <View key={todo.id} style={[styles.todoItemRow, {backgroundColor: THEME.bg, borderLeftColor: todo.category?.color || THEME.main, padding: 10}]}>
                        <TouchableOpacity onPress={() => toggleGlobalTodo(date, todo.id)} style={{marginRight: 10}}>
                          <View style={[styles.stickerCheck, todo.done && {backgroundColor: todo.category?.color || THEME.main, borderColor: 'white'}, {width: 20, height: 20, borderRadius: 10}]}>
                            {todo.done && <CText fontScale={appFontScale} style={{fontSize: 10}}>🌸</CText>}
                          </View>
                        </TouchableOpacity>
                        <CText fontScale={appFontScale} style={[styles.todoText, {fontSize: 14, flex: 1}, todo.done && {textDecorationLine: 'line-through', color: THEME.textDim}]}>{todo.text}</CText>
                      </View>
                    ))}
                  </View>
                )
              })}

              <CText fontScale={appFontScale} style={[styles.sectionTitle, {color: THEME.text, marginBottom: 15, marginTop: 20}]}>📈 기록 변화 타임라인</CText>
              <View style={{marginBottom: 20}}>
                {showGithub && processGitData.length > 0 && (
                  <View style={styles.chartContainer}>
                    <CText fontScale={appFontScale} style={styles.chartTitle}>🐙 GitHub 잔디</CText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
                      {processGitData.map((item, i) => <View key={i} style={styles.timelineItem}><CText fontScale={appFontScale} style={styles.timelineDate}>{item.date}</CText><View style={[styles.timelineSquare, { backgroundColor: '#28A745', opacity: Math.min(1, 0.4+(item.val*0.1)) }]} /><CText fontScale={appFontScale} style={styles.timelineVal}>{item.val}개</CText></View>)}
                    </ScrollView>
                  </View>
                )}
                {showValorant && processValData.length > 0 && (
                  <View style={styles.chartContainer}>
                    <CText fontScale={appFontScale} style={styles.chartTitle}>🔫 Valorant 티어</CText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
                      {processValData.map((item, i) => <View key={i} style={styles.timelineItem}><CText fontScale={appFontScale} style={styles.timelineDate}>{item.date}</CText><View style={[styles.timelineSquare, { backgroundColor: item.color }]} /><CText fontScale={appFontScale} style={styles.timelineTier} numberOfLines={1}>{item.label.split(' ')[0]}</CText><CText fontScale={appFontScale} style={styles.timelineVal}>{item.val} RR</CText></View>)}
                    </ScrollView>
                  </View>
                )}
                {showLol && processLolData.length > 0 && (
                  <View style={styles.chartContainer}>
                    <CText fontScale={appFontScale} style={styles.chartTitle}>⚔️ LoL 티어</CText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
                      {processLolData.map((item, i) => <View key={i} style={styles.timelineItem}><CText fontScale={appFontScale} style={styles.timelineDate}>{item.date}</CText><View style={[styles.timelineSquare, { backgroundColor: item.color }]} /><CText fontScale={appFontScale} style={styles.timelineTier} numberOfLines={1}>{item.label.split(' ')[0]}</CText><CText fontScale={appFontScale} style={styles.timelineVal}>{item.val} LP</CText></View>)}
                    </ScrollView>
                  </View>
                )}
                {showTft && processTftData.length > 0 && (
                  <View style={styles.chartContainer}>
                    <CText fontScale={appFontScale} style={styles.chartTitle}>♟️ TFT 티어</CText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
                      {processTftData.map((item, i) => <View key={i} style={styles.timelineItem}><CText fontScale={appFontScale} style={styles.timelineDate}>{item.date}</CText><View style={[styles.timelineSquare, { backgroundColor: item.color }]} /><CText fontScale={appFontScale} style={styles.timelineTier} numberOfLines={1}>{item.label.split(' ')[0]}</CText><CText fontScale={appFontScale} style={styles.timelineVal}>{item.val} LP</CText></View>)}
                    </ScrollView>
                  </View>
                )}
              </View>

              {showSavings && (
                <>
                  <CText fontScale={appFontScale} style={[styles.sectionTitle, {color: THEME.text, marginBottom: 10, marginTop: 10}]}>🎯 위시리스트 달성도</CText>
                  <View style={styles.financeBox}>
                     <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                        <CText fontScale={appFontScale} style={{color: THEME.text, fontWeight: 'bold'}}>{wishlistGoalName}</CText>
                        <CText fontScale={appFontScale} style={{color: THEME.main, fontWeight: '900'}}>{getSavingsPercent()}%</CText>
                     </View>
                     <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, {width: `${getSavingsPercent()}%`, backgroundColor: THEME.progressBar}]} />
                     </View>
                     <CText fontScale={appFontScale} style={{color: THEME.textDim, fontSize: 11, marginTop: 8, textAlign: 'right'}}>
                       목표: {(parseInt(savingsTarget)||0).toLocaleString()}원 / 현재: {(parseInt(savingsCurrent)||0).toLocaleString()}원
                     </CText>
                  </View>
                </>
              )}
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>

        {isRoutineEditorVisible && (
          <View style={[styles.editorOverlay, {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999}]}>
            <View style={[styles.editorBox, {backgroundColor: THEME.bgModal, width: '90%'}]}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
                <CText fontScale={appFontScale} style={styles.editorTitle}>루틴 관리 ⚡</CText>
                <TouchableOpacity onPress={() => setRoutineEditorVisible(false)}><CText fontScale={appFontScale} style={{fontSize: 20}}>❌</CText></TouchableOpacity>
              </View>
              <ScrollView style={{maxHeight: 250}}>
                {customRoutines.map(r => (
                  <View key={r.id} style={styles.editorRoutineRow}>
                    <CText fontScale={appFontScale} style={{flex:1}}>{r.icon} {r.title}</CText>
                    <TouchableOpacity onPress={() => deleteRoutine(r.id)}><CText fontScale={appFontScale} style={{color:'red'}}>삭제</CText></TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <View style={{marginTop: 20}}>
                <CTextInput fontScale={appFontScale} style={[styles.editorInput, {marginBottom: 10}]} placeholder="루틴 이름 (예: 모닝 루틴)" value={newRoutineTitle} onChangeText={setNewRoutineTitle} />
                <CTextInput fontScale={appFontScale} style={styles.editorInput} placeholder="항목들 (쉼표로 구분)" value={newRoutineTasksStr} onChangeText={setNewRoutineTasksStr} />
                <TouchableOpacity style={[styles.saveButton, {backgroundColor: THEME.main, marginTop: 15}]} onPress={addNewRoutine}>
                  <CText fontScale={appFontScale} style={styles.saveButtonText}>추가하기</CText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>

      <Modal visible={isMonthPickerVisible} transparent={true} animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity style={{flex: 1}} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setMonthPickerVisible(false); }} />
          <View style={[styles.bottomSheetContainer, {backgroundColor: THEME.bgModal}]}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.pickerYearRow}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setPickerYear(y => y - 1); }}><CText fontScale={appFontScale} style={[styles.arrowText, {color: THEME.main}]}>◀</CText></TouchableOpacity>
              <CText fontScale={appFontScale} style={[styles.pickerYearText, {color: THEME.text}]}>{pickerYear}년</CText>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setPickerYear(y => y + 1); }}><CText fontScale={appFontScale} style={[styles.arrowText, {color: THEME.main}]}>▶</CText></TouchableOpacity>
            </View>
            <View style={styles.pickerMonthGrid}>
              {[...Array(12)].map((_, i) => (
                <TouchableOpacity key={i} style={[styles.pickerMonthBtn, {backgroundColor: THEME.bg}]} onPress={() => { 
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
              
              {/* ⭐️ 상세 모달로 이사온 데브&랭크 요약 */}
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
                {combinedEvents.map((ev, idx) => (
                  <View key={idx} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                    <View style={[styles.tagBadge, { backgroundColor: ev.color + '20' }]}><CText fontScale={appFontScale} style={{color: ev.color, fontWeight: 'bold'}}>{ev.isSystem ? '📱 ' : '✨ '}{ev.title}</CText></View>
                    {!ev.isSystem && (
                      <>
                        <TouchableOpacity onPress={() => openEventEditor(ev)} style={{marginLeft: 10}}><CText fontScale={appFontScale}>✏️</CText></TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteEvent(ev.id)} style={{marginLeft: 10}}><CText fontScale={appFontScale}>❌</CText></TouchableOpacity>
                      </>
                    )}
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
                <CText fontScale={appFontScale} style={[styles.sectionTitle, {marginTop: 0, color: THEME.text}]}>📖 다이어리 & 음성 일기</CText>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <TouchableOpacity onPress={isRecording ? stopRecording : startRecording} style={[styles.micBtn, isRecording && {backgroundColor: '#FF5252'}]}>
                    <Text style={{fontSize: 16}}>{isRecording ? '🛑' : '🎤'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsDiaryPreview(!isDiaryPreview)}>
                    <CText fontScale={appFontScale} style={{color: THEME.main, fontWeight: 'bold'}}>{isDiaryPreview ? '✏️ 수정하기' : '👀 미리보기'}</CText>
                  </TouchableOpacity>
                </View>
              </View>

              {currentVoiceMemo && !isRecording && (
                <View style={styles.voicePlayBox}>
                  <TouchableOpacity onPress={playVoiceMemo} style={{flexDirection: 'row', alignItems: 'center'}}>
                    <CText fontScale={appFontScale} style={{fontSize: 20, marginRight: 10}}>▶️</CText>
                    <CText fontScale={appFontScale} style={{color: THEME.text, fontWeight: 'bold'}}>오늘의 음성 일기 듣기</CText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setCurrentVoiceMemo(null)}>
                    <CText fontScale={appFontScale} style={{color: '#E0E0E0', fontSize: 16}}>🗑️</CText>
                  </TouchableOpacity>
                </View>
              )}

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
  // ⭐️ 상태표시줄 여백 싹 지우고 무조건 화면 맨 위(paddingTop 10)에 딱 달라붙게 수정
  calendarArea: { paddingTop: Platform.OS === 'ios' ? 20 : 10, zIndex: 2, paddingBottom: 0 },
  
  // ⭐️ 세모(▼) 줄바꿈을 완벽하게 방지하는 새로운 상단 헤더 정렬
  floatingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10, position: 'relative', height: 40 },
  dDayBadgeContainer: { position: 'absolute', left: 20, top: 5, zIndex: 10 },
  headerButton: { paddingVertical: 5, paddingHorizontal: 15 },
  headerTitle: { fontSize: 22, fontWeight: '900', flexWrap: 'nowrap' },
  
  calendarStyle: { backgroundColor: 'transparent', paddingHorizontal: 5 },
  
  // ⭐️ 예전 스타일(모서리가 둥근 네모 윤곽선) 완벽 복구
  dayCell: { width: 44, height: 46, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6 },
  dayText: { fontSize: 15, fontWeight: '600' },
  holidayLabel: { fontSize: 8, marginTop: 1, fontWeight: 'bold' },
  linesContainer: { width: '80%', alignItems: 'center', marginTop: 2, gap: 1 },
  line: { width: '100%', height: 2.5, borderRadius: 2 },
  
  summaryArea: { flex: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, elevation: 10 },
  summaryGradient: { position: 'absolute', top: -15, left: 0, right: 0, height: 15 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  summaryDateText: { fontSize: 20, fontWeight: '900' },
  openDetailBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  openDetailBtnText: { fontWeight: 'bold', fontSize: 13 },
  
  summaryContent: { flex: 1 },
  emptyStateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 20 },
  summaryItemBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8 },
  summaryColorBar: { width: 4, height: '100%', borderRadius: 2, marginRight: 10 },
  summaryItemText: { fontSize: 15, fontWeight: '600', flex: 1 },
  summaryDiaryBox: { padding: 15, borderRadius: 12, marginTop: 5 },
  
  // 모아보기 모달 즉시 할 일 추가
  quickAddBox: { flexDirection: 'row', marginBottom: 20, alignItems: 'center' },
  quickInput: { flex: 1, backgroundColor: 'white', borderRadius: 15, padding: 15, fontSize: 14, elevation: 2 },
  addBtn: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginLeft: 10, elevation: 3 },
  
  filterChip: { backgroundColor: 'white', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#eee', marginRight: 8, elevation: 2 },
  filterChipText: { fontSize: 13, fontWeight: '700' },
  
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  bottomSheetContainer: { borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 50 },
  bottomSheetHandle: { width: 50, height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginBottom: 25 },
  pickerYearRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, paddingHorizontal: 20 },
  pickerYearText: { fontSize: 26, fontWeight: '900' },
  arrowBtn: { backgroundColor: '#F0F0F0', padding: 12, borderRadius: 25 },
  arrowText: { fontSize: 18 },
  pickerMonthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' },
  pickerMonthBtn: { width: '30%', paddingVertical: 15, alignItems: 'center', marginBottom: 15, borderRadius: 15, borderWidth: 1, borderColor: '#FFE2E2' },
  pickerMonthText: { fontSize: 16, fontWeight: '800' },
  
  modalBgGradient: { flex: 1 },
  // ⭐️ 모달 닫기 버튼 짤림 해결용 넉넉한 패딩 유지
  modalHeader: { paddingTop: Platform.OS === 'ios' ? 60 : 60, paddingBottom: 15, paddingHorizontal: 25 },
  swipeIndicator: { width: 45, height: 6, backgroundColor: '#ddd', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  modalHeaderInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 26, fontWeight: '900' },
  saveButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, alignSelf: 'stretch', justifyContent: 'center' },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  scrollArea: { flex: 1, paddingHorizontal: 20 },
  todayEventBox: { marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.02)', padding: 15, borderRadius: 20 },
  tagBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15 },
  sectionTitle: { fontSize: 19, fontWeight: '800', marginBottom: 10 },
  routineScroll: { flexDirection: 'row', marginBottom: 20, paddingLeft: 5, maxHeight: 50 },
  routineChip: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 25, marginRight: 12, elevation: 3 },
  routineChipText: { fontSize: 14, fontWeight: '700' },
  inputRow: { flexDirection: 'row', marginBottom: 15 },
  inputBox: { flex: 1, borderRadius: 15, padding: 15, fontSize: 16, elevation: 2 },
  todoItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 15, borderRadius: 15, elevation: 2, borderLeftWidth: 5 },
  todoCheckArea: { marginRight: 15 },
  stickerCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  stickerCheckIcon: { fontSize: 14 },
  todoText: { flex: 1, fontSize: 16, fontWeight: '600' },
  todoDelete: { padding: 5 },
  diaryInputContainer: { borderRadius: 20, overflow: 'hidden', marginTop: 10, borderWidth: 1, minHeight: 200 },
  diaryInput: { flex: 1, padding: 20, textAlignVertical: 'top', fontSize: 16, lineHeight: 26 },
  editorOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  editorBox: { padding: 25, borderRadius: 25, width: '100%' },
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
  
  statCard: { width: 140, padding: 15, borderRadius: 20, marginRight: 12, elevation: 3 },
  statCardTitle: { color: 'white', fontWeight: '900', fontSize: 15, marginBottom: 8 },
  statCardDesc: { color: 'white', fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
  statCardSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  emptyGraphBox: { padding: 30, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 20, alignItems: 'center', marginBottom: 20 },
  chartContainer: { marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.5)', padding: 15, borderRadius: 20 },
  chartTitle: { fontSize: 15, fontWeight: 'bold', color: '#5B4D4D', marginBottom: 15 },
  timelineScroll: { flexDirection: 'row' },
  timelineItem: { alignItems: 'center', marginRight: 20 },
  timelineDate: { fontSize: 10, color: '#888', marginBottom: 8 },
  timelineSquare: { width: 32, height: 32, borderRadius: 8, elevation: 2 },
  timelineTier: { fontSize: 12, fontWeight: 'bold', marginTop: 8, width: 40, textAlign: 'center' },
  timelineVal: { fontSize: 11, color: '#666', marginTop: 2 },
  dDayBadge: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'white', borderRadius: 20, elevation: 2, alignItems: 'center' },
  financeBox: { backgroundColor: 'white', padding: 20, borderRadius: 20, elevation: 3, marginBottom: 20 },
  progressBarBg: { height: 12, backgroundColor: '#E0E0E0', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 6 },
  settingLabel: { fontSize: 13, color: '#888', marginBottom: 5, fontWeight: 'bold' },
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  voicePlayBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#eee' }
});