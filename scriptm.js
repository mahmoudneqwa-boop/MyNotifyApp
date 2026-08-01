/**
 * ============================================================================
 * Smart Alarm & Notification System - Complete Master Script
 * ============================================================================
 */

// ==========================================
// 1. Navigation, UI & Audio Context Unlocker
// ==========================================
const menuBtn = document.getElementById('menuBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const pageTitle = document.getElementById('pageTitle');
const navLinks = document.querySelectorAll('.nav-link');
const tabContents = document.querySelectorAll('.tab-content');

// Global Audio Context Unlighting for Mobile/Browsers Policy
let globalAudioCtx = null;

function getAudioContext() {
    if (!globalAudioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            globalAudioCtx = new AudioContextClass();
        }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
    }
    return globalAudioCtx;
}

// Unlock audio on first user touch/click anywhere
function unlockAudio() {
    getAudioContext();
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
}
document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);

function toggleSidebar(show) {
    if (sidebar && overlay) {
        sidebar.classList.toggle('active', show);
        overlay.classList.toggle('active', show);
    }
}

if (menuBtn) menuBtn.addEventListener('click', () => toggleSidebar(true));
if (closeMenuBtn) closeMenuBtn.addEventListener('click', () => toggleSidebar(false));
if (overlay) overlay.addEventListener('click', () => toggleSidebar(false));

function switchTab(tabId) {
    const targetLink = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
    
    navLinks.forEach(l => l.classList.remove('active'));
    tabContents.forEach(tab => tab.classList.remove('active'));

    const activeTabEl = document.getElementById(tabId);
    if (activeTabEl) activeTabEl.classList.add('active');

    if (targetLink) {
        targetLink.classList.add('active');
        if (pageTitle) pageTitle.textContent = targetLink.textContent.trim();
    }
    toggleSidebar(false);
}

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        const targetTab = link.getAttribute('data-tab');
        switchTab(targetTab);
    });
});

function updateMiniClock() {
    const miniClock = document.getElementById('miniClock');
    if (miniClock) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        miniClock.textContent = `${hours}:${minutes}:${seconds}`;
    }
}
setInterval(updateMiniClock, 1000);
updateMiniClock();

// طلب صلاحيات الإشعارات عند بدء التطبيق
if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
}

// ==========================================
// 2. Data Persistence & Settings
// ==========================================
let alarms = JSON.parse(localStorage.getItem('my_alarms')) || [];
let notifications = JSON.parse(localStorage.getItem('my_notifications')) || [];
let appSettings = JSON.parse(localStorage.getItem('my_app_settings')) || {
    theme: 'dark',
    volume: 1.0
};

function saveData() {
    localStorage.setItem('my_alarms', JSON.stringify(alarms));
    localStorage.setItem('my_notifications', JSON.stringify(notifications));
    localStorage.setItem('my_app_settings', JSON.stringify(appSettings));
}

// التصدير والاسترجاع
function exportBackupData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ alarms, notifications, appSettings }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `alarm_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importBackupData(fileEvent) {
    const file = fileEvent.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.alarms) alarms = parsed.alarms;
            if (parsed.notifications) notifications = parsed.notifications;
            saveData();
            renderAlarms();
            renderNotifications();
            alert("تم استعادة النسخة الاحتياطية بنجاح!");
        } catch (err) {
            alert("فشل استرجاع البيانات: الملف غير صالح!");
        }
    };
    reader.readAsText(file);
}

// ==========================================
// 3. Alarms System & Controls
// ==========================================
const dayBtns = document.querySelectorAll('.day-btn:not(.edit-day-btn)');
let selectedDays = [];

dayBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const day = parseInt(btn.getAttribute('data-day'));
        if (selectedDays.includes(day)) {
            selectedDays = selectedDays.filter(d => d !== day);
            btn.classList.remove('selected');
        } else {
            selectedDays.push(day);
            btn.classList.add('selected');
        }
    });
});

const addAlarmBtn = document.getElementById('addAlarmBtn');
if (addAlarmBtn) {
    addAlarmBtn.addEventListener('click', () => {
        const alarmTimeInput = document.getElementById('alarmTime');
        const alarmMissionSelect = document.getElementById('alarmMission');
        const alarmSoundSelect = document.getElementById('alarmSoundSelect');
        const gentleWakeCheck = document.getElementById('gentleWake');

        const time = alarmTimeInput ? alarmTimeInput.value : '';
        if (!time) return alert("برجاء اختيار وقت المنبه!");

        const newAlarm = {
            id: Date.now(),
            time: time,
            days: selectedDays.length > 0 ? [...selectedDays] : [0, 1, 2, 3, 4, 5, 6],
            mission: alarmMissionSelect ? alarmMissionSelect.value : 'none',
            sound: alarmSoundSelect ? alarmSoundSelect.value : 'digital',
            gentleWake: gentleWakeCheck ? gentleWakeCheck.checked : false,
            snoozeCount: 0,
            active: true,
            lastTriggered: null
        };

        alarms.push(newAlarm);
        saveData();
        renderAlarms();

        // إعادة ضبط الحقول والتحويل لصفحة المنبهات المسجلة
        if (alarmTimeInput) alarmTimeInput.value = '';
        selectedDays = [];
        dayBtns.forEach(b => b.classList.remove('selected'));
        
        switchTab('tab-alarm-list');
    });
}

function renderAlarms() {
    const alarmsList = document.getElementById('alarmsList');
    if (!alarmsList) return;

    alarmsList.innerHTML = alarms.length === 0 
        ? '<p style="color:#64748b; text-align:center; padding: 20px;">لا توجد منبهات مضافة بعد.</p>' 
        : '';

    const dayNames = ["أح", "إث", "ثل", "أر", "خم", "جم", "سب"];

    alarms.forEach(alarm => {
        const item = document.createElement('div');
        item.className = `item-card ${alarm.active ? '' : 'disabled'}`;
        
        const daysText = alarm.days.length === 7 ? "يومياً" : alarm.days.map(d => dayNames[d]).join('، ');

        item.innerHTML = `
            <div class="item-info">
                <div class="item-title">${alarm.time}</div>
                <div class="item-sub">الأيام: ${daysText} | التحدي: ${getMissionLabel(alarm.mission)} | الصوت: ${alarm.sound}</div>
            </div>
            <div class="item-actions">
                <label class="switch">
                    <input type="checkbox" ${alarm.active ? 'checked' : ''} onchange="toggleAlarmActive(${alarm.id})">
                    <span class="slider"></span>
                </label>
                <button onclick="openEditAlarmModal(${alarm.id})" class="btn-action-icon" title="تعديل">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button onclick="deleteAlarm(${alarm.id})" class="btn-action-icon delete" title="حذف">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        alarmsList.appendChild(item);
    });
}

function getMissionLabel(missionKey) {
    const map = {
        'none': 'بدون',
        'math': 'مسألة رياضية',
        'text': 'كتابة نص',
        'memory': 'تحدي الذاكرة'
    };
    return map[missionKey] || missionKey;
}

function toggleAlarmActive(id) {
    const alarm = alarms.find(a => a.id === id);
    if (alarm) {
        alarm.active = !alarm.active;
        saveData();
        renderAlarms();
    }
}

function deleteAlarm(id) {
    alarms = alarms.filter(a => a.id !== id);
    saveData();
    renderAlarms();
}

// Edit Alarm Modal Logic
let editSelectedDays = [];
const editModal = document.getElementById('editModal');
const editDayBtns = document.querySelectorAll('.edit-day-btn');

editDayBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const day = parseInt(btn.getAttribute('data-day'));
        if (editSelectedDays.includes(day)) {
            editSelectedDays = editSelectedDays.filter(d => d !== day);
            btn.classList.remove('selected');
        } else {
            editSelectedDays.push(day);
            btn.classList.add('selected');
        }
    });
});

function openEditAlarmModal(id) {
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;

    const editIdInput = document.getElementById('editAlarmId');
    const editTimeInput = document.getElementById('editAlarmTime');
    const editMissionInput = document.getElementById('editAlarmMission');
    const editSoundInput = document.getElementById('editAlarmSoundSelect');
    const editGentleInput = document.getElementById('editGentleWake');

    if (editIdInput) editIdInput.value = alarm.id;
    if (editTimeInput) editTimeInput.value = alarm.time;
    if (editMissionInput) editMissionInput.value = alarm.mission;
    if (editSoundInput) editSoundInput.value = alarm.sound;
    if (editGentleInput) editGentleInput.checked = alarm.gentleWake;

    editSelectedDays = [...alarm.days];
    editDayBtns.forEach(btn => {
        const day = parseInt(btn.getAttribute('data-day'));
        if (editSelectedDays.includes(day)) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    if (editModal) editModal.classList.add('active');
}

const saveEditAlarmBtn = document.getElementById('saveEditAlarmBtn');
const cancelEditAlarmBtn = document.getElementById('cancelEditAlarmBtn');

if (saveEditAlarmBtn) {
    saveEditAlarmBtn.addEventListener('click', () => {
        const idInput = document.getElementById('editAlarmId');
        if (!idInput) return;
        
        const id = parseInt(idInput.value);
        const alarm = alarms.find(a => a.id === id);

        if (alarm) {
            alarm.time = document.getElementById('editAlarmTime').value;
            alarm.mission = document.getElementById('editAlarmMission').value;
            alarm.sound = document.getElementById('editAlarmSoundSelect').value;
            alarm.gentleWake = document.getElementById('editGentleWake').checked;
            alarm.days = editSelectedDays.length > 0 ? [...editSelectedDays] : [0, 1, 2, 3, 4, 5, 6];

            saveData();
            renderAlarms();
        }
        if (editModal) editModal.classList.remove('active');
    });
}

if (cancelEditAlarmBtn) {
    cancelEditAlarmBtn.addEventListener('click', () => {
        if (editModal) editModal.classList.remove('active');
    });
}

// ==========================================
// 4. Custom Voice Notifications & Audio Recording
// ==========================================
const soundTypeRadios = document.querySelectorAll('input[name="soundType"]');
const ttsInputBox = document.getElementById('ttsInputBox');
const recordInputBox = document.getElementById('recordInputBox');
const customAudioBox = document.getElementById('customAudioBox');

let mediaRecorder, audioChunks = [], recordedAudioBase64 = null, customAudioBase64 = null;

soundTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (ttsInputBox) ttsInputBox.style.display = e.target.value === 'tts' ? 'block' : 'none';
        if (recordInputBox) recordInputBox.style.display = e.target.value === 'record' ? 'block' : 'none';
        if (customAudioBox) customAudioBox.style.display = e.target.value === 'custom' ? 'block' : 'none';
    });
});

const startRecBtn = document.getElementById('startRecBtn');
const stopRecBtn = document.getElementById('stopRecBtn');
const audioPreview = document.getElementById('audioPreview');

if (startRecBtn && stopRecBtn) {
    startRecBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    recordedAudioBase64 = reader.result;
                    if (audioPreview) {
                        audioPreview.src = recordedAudioBase64;
                        audioPreview.style.display = 'block';
                    }
                };
            };

            mediaRecorder.start();
            startRecBtn.disabled = true;
            stopRecBtn.disabled = false;
        } catch (err) {
            alert("يرجى إعطاء صلاحية المايك لتسجيل الصوت!");
        }
    });

    stopRecBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            startRecBtn.disabled = false;
            stopRecBtn.disabled = true;
        }
    });
}

const customAudioFileInput = document.getElementById('customAudioFile');
if (customAudioFileInput) {
    customAudioFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = evt => customAudioBase64 = evt.target.result;
            reader.readAsDataURL(file);
        }
    });
}

const addNotifyBtn = document.getElementById('addNotifyBtn');
if (addNotifyBtn) {
    addNotifyBtn.addEventListener('click', () => {
        const notifyDateTimeInput = document.getElementById('notifyDateTime');
        const soundTypeChecked = document.querySelector('input[name="soundType"]:checked');
        const repeatCountInput = document.getElementById('repeatCount');

        const datetime = notifyDateTimeInput ? notifyDateTimeInput.value : '';
        const type = soundTypeChecked ? soundTypeChecked.value : 'tts';
        const repeats = repeatCountInput ? parseInt(repeatCountInput.value) || 1 : 1;

        if (!datetime) return alert("يرجى اختيار التاريخ والوقت!");

        let payload = {};
        if (type === 'tts') {
            const ttsTextInput = document.getElementById('ttsText');
            const announceCheck = document.getElementById('announceTimeCheck');
            const text = ttsTextInput ? ttsTextInput.value.trim() : '';
            if (!text) return alert("يرجى كتابة النص المراد قراءته!");
            payload = { 
                type: 'tts', 
                text: text, 
                addTime: announceCheck ? announceCheck.checked : false 
            };
        } else if (type === 'record') {
            if (!recordedAudioBase64) return alert("يرجى تسجيل الصوت أولاً!");
            payload = { type: 'audio', audio: recordedAudioBase64 };
        } else {
            if (!customAudioBase64) return alert("يرجى اختيار ملف صوتي!");
            payload = { type: 'audio', audio: customAudioBase64 };
        }

        notifications.push({
            id: Date.now(),
            datetime: datetime,
            payload: payload,
            repeats: repeats,
            triggered: false
        });

        saveData();
        renderNotifications();
        alert("تم جدولة التنبيه بنجاح!");
    });
}

function renderNotifications() {
    const notifyList = document.getElementById('notifyList');
    if (!notifyList) return;

    notifyList.innerHTML = notifications.length === 0 
        ? '<p style="color:#64748b; text-align:center;">لا توجد تنبيهات مجدولة.</p>' 
        : '';

    notifications.forEach(note => {
        const item = document.createElement('div');
        item.className = 'item-card';
        
        item.innerHTML = `
            <div class="item-info">
                <div class="item-title">${new Date(note.datetime).toLocaleString('ar-EG')}</div>
                <div class="item-sub">النوع: ${note.payload.type === 'tts' ? 'قراءة نص' : 'ملف/تسجيل صوتي'} | تكرار: ${note.repeats} مرات</div>
            </div>
            <div class="item-actions">
                <button onclick="deleteNotification(${note.id})" class="btn-action-icon delete" title="حذف">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        notifyList.appendChild(item);
    });
}

function deleteNotification(id) {
    notifications = notifications.filter(n => n.id !== id);
    saveData();
    renderNotifications();
}

// ==========================================
// 5. Ringing Engine & Missions Core
// ==========================================
let isRinging = false;
let activeAudio = null;
let currentMissionAnswer = null;
let gentleInterval = null;
let beepLoopTimeout = null;

const ringModal = document.getElementById('ringModal');

// Loop checking with timestamp safety to prevent background throttle skips
setInterval(() => {
    if (isRinging) return;

    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDateStr = now.toISOString().slice(0, 10);
    const currentDay = now.getDay();

    // Check Alarms
    alarms.forEach(alarm => {
        const triggerKey = `${currentDateStr}_${alarm.time}`;
        if (alarm.active && alarm.time === currentTimeStr && alarm.days.includes(currentDay)) {
            if (alarm.lastTriggered !== triggerKey) {
                alarm.lastTriggered = triggerKey;
                saveData();
                triggerAlarm(alarm);
            }
        }
    });

    // Check Notifications
    notifications.forEach(note => {
        if (!note.triggered) {
            const noteTime = new Date(note.datetime).getTime();
            if (Math.abs(now.getTime() - noteTime) <= 2000) {
                note.triggered = true;
                saveData();
                triggerNotification(note);
            }
        }
    });
}, 1000);

function sendSystemNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: body, icon: 'iconf.png' });
    }
}

function triggerAlarm(alarm) {
    isRinging = true;
    if (navigator.vibrate) navigator.vibrate([1000, 500, 1000, 500]);
    sendSystemNotification("تنبيه المنبه", `حان موعد المنبه: ${alarm.time}`);

    const ringTitle = document.getElementById('ringTitle');
    const ringMessage = document.getElementById('ringMessage');
    
    if (ringTitle) ringTitle.textContent = `منبه الساعة ${alarm.time}`;
    if (ringMessage) ringMessage.textContent = "قوم صحصح يلا!";
    if (ringModal) ringModal.classList.add('active');

    setupMissionUI(alarm.mission);
    startAlarmSound(alarm.sound, alarm.gentleWake);
}

function setupMissionUI(missionType) {
    const missionBox = document.getElementById('missionBox');
    const missionQuestion = document.getElementById('missionQuestion');
    const missionAnswerInput = document.getElementById('missionAnswer');

    if (missionAnswerInput) missionAnswerInput.value = '';

    if (missionType === 'math') {
        if (missionBox) missionBox.style.display = 'block';
        const operators = ['+', '-', '*'];
        const op = operators[Math.floor(Math.random() * operators.length)];
        let num1 = Math.floor(Math.random() * 15) + 5;
        let num2 = Math.floor(Math.random() * 10) + 2;

        if (op === '*') { num1 = Math.floor(Math.random() * 9) + 2; }
        
        currentMissionAnswer = eval(`${num1} ${op} ${num2}`).toString();
        if (missionQuestion) missionQuestion.textContent = `احسب لإيقاف المنبه: ${num1} ${op} ${num2} = ?`;
    } 
    else if (missionType === 'text') {
        if (missionBox) missionBox.style.display = 'block';
        const phrases = ["أنا صاحي ومستعد", "صباح الخير والنشاط", "يوم جديد وإنجاز جديد"];
        currentMissionAnswer = phrases[Math.floor(Math.random() * phrases.length)];
        if (missionQuestion) missionQuestion.textContent = `اكتب النص التالي بدقة: "${currentMissionAnswer}"`;
    } 
    else if (missionType === 'memory') {
        if (missionBox) missionBox.style.display = 'block';
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        currentMissionAnswer = code;
        if (missionQuestion) missionQuestion.textContent = `احفظ واكتب الرمز التالي: ${code}`;
    }
    else {
        if (missionBox) missionBox.style.display = 'none';
        currentMissionAnswer = null;
    }
}

function triggerNotification(note) {
    isRinging = true;
    if (navigator.vibrate) navigator.vibrate([500, 500, 500]);
    sendSystemNotification("تنبيه صوتي مخصص", "لديك تنبيه الآن!");

    const ringTitle = document.getElementById('ringTitle');
    const missionBox = document.getElementById('missionBox');

    if (ringTitle) ringTitle.textContent = "تنبيه صوتي مخصص!";
    if (ringModal) ringModal.classList.add('active');
    if (missionBox) missionBox.style.display = 'none';

    let count = 0;
    const playRoutine = () => {
        if (!isRinging || count >= note.repeats) return;

        if (note.payload.type === 'tts') {
            let msg = note.payload.text;
            if (note.payload.addTime) {
                const now = new Date();
                msg += ` .. الساعة الآن ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
            }
            const ringMessage = document.getElementById('ringMessage');
            if (ringMessage) ringMessage.textContent = msg;

            const utterance = new SpeechSynthesisUtterance(msg);
            utterance.lang = 'ar-SA';
            utterance.rate = 0.9;
            utterance.onend = () => {
                count++;
                if (count < note.repeats && isRinging) setTimeout(playRoutine, 3000);
            };
            window.speechSynthesis.speak(utterance);
        } else {
            activeAudio = new Audio(note.payload.audio);
            activeAudio.play();
            activeAudio.onended = () => {
                count++;
                if (count < note.repeats && isRinging) setTimeout(playRoutine, 2000);
            };
        }
    };

    playRoutine();
}

// Custom Synthesizer Sound Engine with AudioContext
function startAlarmSound(soundType, gentle) {
    const ctx = getAudioContext();
    if (!ctx) return;

    let currentVol = gentle ? 0.05 : 0.8;
    
    if (gentle) {
        gentleInterval = setInterval(() => {
            if (currentVol < 0.9) {
                currentVol += 0.05;
            }
        }, 2000);
    }

    const playPulse = () => {
        if (!isRinging) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Sound Variations
        if (soundType === 'chime') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.3); // E5
        } else if (soundType === 'radar') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.15);
        } else if (soundType === 'bell') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
        } else {
            // Default Digital
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
        }

        gain.gain.setValueAtTime(currentVol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.8);

        beepLoopTimeout = setTimeout(playPulse, 1200);
    };

    playPulse();
}

const stopRingBtn = document.getElementById('stopRingBtn');
if (stopRingBtn) {
    stopRingBtn.addEventListener('click', () => {
        if (currentMissionAnswer) {
            const missionAnswerInput = document.getElementById('missionAnswer');
            const userAnswer = missionAnswerInput ? missionAnswerInput.value.trim() : '';
            if (userAnswer !== currentMissionAnswer) {
                alert("إجابة التحدي خاطئة! حاول مجدداً لإيقاف المنبه.");
                return;
            }
        }
        stopEverything();
    });
}

const snoozeBtn = document.getElementById('snoozeBtn');
if (snoozeBtn) {
    snoozeBtn.addEventListener('click', () => {
        stopEverything();
        alert("تم تفعيل الغفوة! سيرن المنبه مجدداً بعد 5 دقائق.");
        setTimeout(() => {
            triggerAlarm({ 
                time: "غفوة", 
                mission: "none", 
                sound: "digital", 
                gentleWake: false, 
                days: [0, 1, 2, 3, 4, 5, 6] 
            });
        }, 5 * 60 * 1000);
    });
}

function stopEverything() {
    isRinging = false;
    if (ringModal) ringModal.classList.remove('active');
    
    const missionAnswerInput = document.getElementById('missionAnswer');
    if (missionAnswerInput) missionAnswerInput.value = '';

    if (activeAudio) { activeAudio.pause(); activeAudio = null; }
    if (gentleInterval) { clearInterval(gentleInterval); gentleInterval = null; }
    if (beepLoopTimeout) { clearTimeout(beepLoopTimeout); beepLoopTimeout = null; }
    
    window.speechSynthesis.cancel();
}

// ==========================================
// 6. Timer & Stopwatch Modules
// ==========================================
let timerInterval = null, timerTotalSeconds = 0;

const startTimerBtn = document.getElementById('startTimerBtn');
const pauseTimerBtn = document.getElementById('pauseTimerBtn');
const resetTimerBtn = document.getElementById('resetTimerBtn');

if (startTimerBtn) {
    startTimerBtn.addEventListener('click', () => {
        if (timerInterval) return;
        const minInput = document.getElementById('timerMin');
        const secInput = document.getElementById('timerSec');

        const min = minInput ? parseInt(minInput.value) || 0 : 0;
        const sec = secInput ? parseInt(secInput.value) || 0 : 0;

        if (timerTotalSeconds === 0) timerTotalSeconds = (min * 60) + sec;
        if (timerTotalSeconds <= 0) return alert("برجاء إدخال وقت صحيح للعداد!");

        timerInterval = setInterval(() => {
            timerTotalSeconds--;
            const h = String(Math.floor(timerTotalSeconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((timerTotalSeconds % 3600) / 60)).padStart(2, '0');
            const s = String(timerTotalSeconds % 60).padStart(2, '0');
            
            const timerDisplay = document.getElementById('timerDisplay');
            if (timerDisplay) timerDisplay.textContent = `${h}:${m}:${s}`;

            if (timerTotalSeconds <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                playTimerFinishSound();
                sendSystemNotification("انتهى العداد", "انتهى وقت العداد التنازلي بنجاح!");
                alert("انتهى العداد (Timer)!");
            }
        }, 1000);
    });
}

function playTimerFinishSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
}

if (pauseTimerBtn) {
    pauseTimerBtn.addEventListener('click', () => { 
        clearInterval(timerInterval); 
        timerInterval = null; 
    });
}

if (resetTimerBtn) {
    resetTimerBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        timerInterval = null;
        timerTotalSeconds = 0;
        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) timerDisplay.textContent = "00:00:00";
    });
}

// Stopwatch Logic
let swInterval = null, swElapsedTime = 0, swLapCount = 0;
const startSwBtn = document.getElementById('startSwBtn');
const resetSwBtn = document.getElementById('resetSwBtn');
const lapSwBtn = document.getElementById('lapSwBtn');

if (startSwBtn) {
    startSwBtn.addEventListener('click', function() {
        if (swInterval) {
            clearInterval(swInterval);
            swInterval = null;
            this.textContent = "تشغيل";
        } else {
            const startTime = Date.now() - swElapsedTime;
            swInterval = setInterval(() => {
                swElapsedTime = Date.now() - startTime;
                const m = String(Math.floor(swElapsedTime / 60000)).padStart(2, '0');
                const s = String(Math.floor((swElapsedTime % 60000) / 1000)).padStart(2, '0');
                const ms = String(Math.floor((swElapsedTime % 1000) / 10)).padStart(2, '0');
                
                const swDisplay = document.getElementById('swDisplay');
                if (swDisplay) swDisplay.textContent = `${m}:${s}.${ms}`;
            }, 10);
            this.textContent = "إيقاف";
        }
    });
}

if (resetSwBtn) {
    resetSwBtn.addEventListener('click', () => {
        clearInterval(swInterval);
        swInterval = null;
        swElapsedTime = 0;
        swLapCount = 0;
        
        const swDisplay = document.getElementById('swDisplay');
        const swLapsList = document.getElementById('swLapsList');
        
        if (swDisplay) swDisplay.textContent = "00:00.00";
        if (swLapsList) swLapsList.innerHTML = '';
        if (startSwBtn) startSwBtn.textContent = "تشغيل";
    });
}

if (lapSwBtn) {
    lapSwBtn.addEventListener('click', () => {
        if (swElapsedTime === 0) return;
        swLapCount++;
        const swDisplay = document.getElementById('swDisplay');
        const swLapsList = document.getElementById('swLapsList');
        
        if (swDisplay && swLapsList) {
            const lapItem = document.createElement('div');
            lapItem.className = 'lap-item';
            lapItem.innerHTML = `<span>دورة ${swLapCount}</span><strong>${swDisplay.textContent}</strong>`;
            swLapsList.prepend(lapItem);
        }
    });
}

// Initializing UI Rendering on Startup
renderAlarms();
renderNotifications();
