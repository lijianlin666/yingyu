// DOM 元素
const levelSelection = document.getElementById('levelSelection');
const wordLearning = document.getElementById('wordLearning');
const backButton = document.getElementById('backButton');
const levelTitle = document.getElementById('levelTitle');
const chineseWord = document.getElementById('chineseWord');
const russianInput = document.getElementById('russianInput');
const feedback = document.getElementById('feedback');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');
const speakButton = document.getElementById('speakButton');
const confirmButton = document.getElementById('confirmButton');
const loadingIndicator = document.getElementById('loadingIndicator');
const sceneCategoryButtons = document.getElementById('sceneCategoryButtons');
const levelCategoryButtons = document.getElementById('levelCategoryButtons');
const bookCategoryButtons = document.getElementById('bookCategoryButtons');

// 新增：获取开关元素和控制面板
const speakToggle = document.getElementById('speakToggle');
const soundToggle = document.getElementById('soundToggle');
const controlPanel = document.getElementById('controlPanel');
const godModeToggle = document.getElementById('godModeToggle');

// 新增：单词展示页面相关DOM
const wordShowcasePage = document.getElementById('wordShowcasePage');
const wordCardsContainer = document.getElementById('wordCardsContainer');
const startLearningBtn = document.getElementById('startLearningBtn');
const showcaseTitle = document.getElementById('showcaseTitle');
const showcaseBackBtn = document.getElementById('showcaseBackBtn');

// 纯网络TTS语音播放器
class NetworkOnlyVoicePlayer {
    constructor() {
        this.strategies = [
            this.googleTTS.bind(this),
            this.alternativeGoogleTTS.bind(this)
        ];
        this.successfulStrategy = null;
    }
    
    async speak(text) {
        // 优先尝试上次成功的策略
        if (this.successfulStrategy !== null) {
            try {
                const success = await this.strategies[this.successfulStrategy](text);
                if (success) return true;
            } catch (error) {
                this.successfulStrategy = null;
            }
        }
        
        // 按顺序尝试所有策略
        for (let i = 0; i < this.strategies.length; i++) {
            try {
                const success = await this.strategies[i](text);
                if (success) {
                    this.successfulStrategy = i;
                    return true;
                }
            } catch (error) {
                console.log(`策略${i}失败:`, error);
                continue;
            }
        }
        
        return false;
    }
    
    // Google TTS（主要方案）
    async googleTTS(text) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.src = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ru&client=tw-ob`;
            
            audio.oncanplaythrough = () => {
                audio.play().then(() => resolve(true)).catch(() => resolve(false));
            };
            
            audio.onerror = () => resolve(false);
            
            setTimeout(() => resolve(false), 8000);
        });
    }
    
    // 备选Google TTS（使用不同的参数）
    async alternativeGoogleTTS(text) {
        return new Promise((resolve) => {
            const audio = new Audio();
            // 使用不同的Google TTS参数
            audio.src = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ru&client=gtx`;
            
            audio.oncanplaythrough = () => {
                audio.play().then(() => resolve(true)).catch(() => resolve(false));
            };
            
            audio.onerror = () => resolve(false);
            
            setTimeout(() => resolve(false), 8000);
        });
    }
}

// 创建全局语音播放器实例
const networkVoicePlayer = new NetworkOnlyVoicePlayer();
let currentLevel = '';
let currentWordIndex = 0;
let words = [];
let stats = {
    correct: 0,
    incorrect: 0
};

// 新增：功能开关状态（默认关闭）
let settings = {
    speakEnabled: false,  // 语音朗读开关，默认关闭
    soundEnabled: false,   // 提示音效开关，默认关闭
    godModeEnabled: false  // 上帝模式开关，默认关闭
};

// 语音合成变量
let speechSynthesis = window.speechSynthesis;
let russianVoice = null;

let showcaseWords = [];
let showcaseCategoryTitle = '';

// 初始化页面
function init() {
    wordLearning.style.display = 'none';
    controlPanel.style.display = 'none';
    
    // 同步开关按钮的显示状态
    speakToggle.checked = settings.speakEnabled;
    soundToggle.checked = settings.soundEnabled;
    if (godModeToggle) {
        godModeToggle.checked = settings.godModeEnabled;
    }
    
    // 显示加载指示器
    loadingIndicator.style.display = 'block';
    
    // 从JSON文件加载数据
    fetch('words.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应异常');
            }
            return response.json();
        })
        .then(data => {
            wordDatabase = data;
            // 创建分类按钮
            createCategoryButtons();
            loadingIndicator.style.display = 'none';
        })
        .catch(error => {
            console.error('加载单词数据失败:', error);
            loadingIndicator.innerHTML = '<p style="color:#ff6b6b">加载失败，请检查网络连接或文件路径</p>';
        });
    
    // 初始化语音合成
    initSpeechSynthesis();
    
    // Safari 需要用户交互后才能使用语音
    document.addEventListener('click', handleFirstInteraction);
}

// 初始化语音合成功能（简化版）
function initSpeechSynthesis() {
    // 现在使用纯网络TTS方案，不需要复杂的初始化
    console.log('使用纯网络TTS方案，无需复杂初始化');
}

// Safari 首次用户交互处理
function handleFirstInteraction() {
    // 在用户交互后取消语音（激活API）
    if (speechSynthesis && speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    
    // 只需执行一次
    document.removeEventListener('click', handleFirstInteraction);
}

// 创建分类按钮
function createCategoryButtons() {
    // 清空现有按钮
    sceneCategoryButtons.innerHTML = '';
    levelCategoryButtons.innerHTML = '';
    bookCategoryButtons.innerHTML = '';
    
    // 创建分类映射 {分类值: 单词数量}
    const sceneCategories = {};
    const levelCategories = {};
    const bookCategories = {};
    
    wordDatabase.forEach(word => {
        // 场景分类
        const sceneCat = word.sceneCategory || '无场景分类';
        sceneCategories[sceneCat] = (sceneCategories[sceneCat] || 0) + 1;
        
        // 级别分类
        const levelCat = word.level || '无级别分类';
        levelCategories[levelCat] = (levelCategories[levelCat] || 0) + 1;
        
        // 词书分类
        const bookCat = word.bookCategory || '无词书分类';
        bookCategories[bookCat] = (bookCategories[bookCat] || 0) + 1;
    });
    
    // 创建场景分类按钮
    createButtonsForCategory(sceneCategoryButtons, sceneCategories, 'scene');
    
    // 创建级别分类按钮
    createButtonsForCategory(levelCategoryButtons, levelCategories, 'level');
    
    // 创建词书分类按钮
    createButtonsForCategory(bookCategoryButtons, bookCategories, 'book');
}

// 为指定分类创建按钮
function createButtonsForCategory(container, categories, type) {
    Object.entries(categories).forEach(([category, count]) => {
        const button = document.createElement('div');
        button.className = 'category-button';
        button.dataset.type = type;
        button.dataset.value = category === '无场景分类' || 
                              category === '无级别分类' || 
                              category === '无词书分类' ? '' : category;
        
        button.innerHTML = `${category} <span class="count">(${count})</span>`;
        
        button.addEventListener('click', function() {
            const categoryType = this.dataset.type;
            const categoryValue = this.dataset.value;
            
            // 筛选对应分类的单词
            const filteredWords = wordDatabase.filter(word => {
                if (categoryType === 'scene') {
                    const wordValue = word.sceneCategory || '';
                    return categoryValue ? wordValue === categoryValue : !wordValue;
                } 
                else if (categoryType === 'level') {
                    const wordValue = word.level || '';
                    return categoryValue ? wordValue === categoryValue : !wordValue;
                }
                else if (categoryType === 'book') {
                    const wordValue = word.bookCategory || '';
                    return categoryValue ? wordValue === categoryValue : !wordValue;
                }
                return false;
            });
            
            if (filteredWords.length > 0) {
                // 只展示具体分类内容，不加前缀
                showcaseWords = filteredWords;
                showcaseCategoryTitle = category;
                showWordShowcasePage();
            } else {
                feedback.innerHTML = `<div class="incorrect">该分类下没有单词</div>`;
            }
        });
        
        container.appendChild(button);
    });
}

// 获取分类名称
function getCategoryName(type) {
    switch(type) {
        case 'scene': return '场景分类';
        case 'level': return '级别分类';
        case 'book': return '词书分类';
        default: return '';
    }
}

// 开始学习
function startLearning(filteredWords, categoryTitle) {
    words = filteredWords;
    currentWordIndex = 0;
    stats = { correct: 0, incorrect: 0 };
    
    // 只展示具体分类内容
    levelTitle.textContent = categoryTitle;
    
    // 显示单词学习页面
    levelSelection.style.display = 'none';
    wordLearning.style.display = 'block';
    
    // 添加learning-mode类到body，隐藏导航栏
    document.body.classList.add('learning-mode');
    console.log('已添加learning-mode类，导航栏应该隐藏');
    
    // 强制刷新CSS
    setTimeout(() => {
        const nav = document.querySelector('.top-nav');
        if (nav) {
            nav.style.display = 'none';
            nav.style.visibility = 'hidden';
            nav.style.opacity = '0';
            nav.style.position = 'absolute';
            nav.style.left = '-9999px';
            nav.style.top = '-9999px';
            nav.style.width = '0';
            nav.style.height = '0';
            nav.style.overflow = 'hidden';
            nav.style.pointerEvents = 'none';
            console.log('强制隐藏导航栏');
        }
    }, 100);
    
    // 再次确保隐藏 - 针对移动设备
    setTimeout(() => {
        const nav = document.querySelector('.top-nav');
        if (nav) {
            nav.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; position: absolute !important; left: -9999px !important; top: -9999px !important; width: 0 !important; height: 0 !important; overflow: hidden !important; pointer-events: none !important;';
            console.log('再次强制隐藏导航栏');
        }
    }, 500);
    
    // 显示控制面板（固定在右上角）
    controlPanel.style.display = 'flex';
    controlPanel.style.top = '80px';
    controlPanel.style.right = '15px';
    
    // 显示第一个单词
    showCurrentWord();
}

// 显示当前单词
function showCurrentWord() {
    console.log('显示当前单词，上帝模式状态:', settings.godModeEnabled);
    const word = words[currentWordIndex];
    
    // 添加淡入动画
    chineseWord.classList.remove('fade-in');
    
    setTimeout(() => {
        chineseWord.textContent = word.translation;
        
        // 清空输入、反馈
        russianInput.value = '';
        feedback.textContent = '';
        feedback.className = 'feedback';
        
        // 添加淡入动画
        chineseWord.classList.add('fade-in');
        
        // 聚焦到输入框
        russianInput.focus();
        
        // 更新进度
        updateProgress();
        
        // 自动朗读当前单词（根据开关状态）
        setTimeout(() => {
            if (settings.speakEnabled) {
                speakCurrentWord();
            }
        }, 500);
       
        // 如果上帝模式开启，直接自动点击上帝按钮
        if (settings.godModeEnabled) {
            console.log('上帝模式已开启，准备自动点击上帝按钮');
            setTimeout(() => {
                const godButton = document.getElementById('godButton');
                console.log('找到上帝按钮:', godButton);
                if (godButton) {
                    console.log('自动点击上帝按钮');
                    godButton.click();
                }
            }, 800); // 延迟800ms，让用户先看到单词
        }
    }, 50);
}

// 更新进度
function updateProgress() {
    const progress = ((currentWordIndex + 1) / words.length) * 100;
    progressText.textContent = `${currentWordIndex + 1}/${words.length}`;
    progressBar.style.width = `${progress}%`;
}

// 检查答案
function checkAnswer() {
    const userAnswer = russianInput.value.trim();
    const correctAnswer = words[currentWordIndex].word;
    
    if (userAnswer === '') return;
    
    // 修改为不区分大小写对比
    if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
        feedback.textContent = "✓ 正确！";
        feedback.className = "feedback correct";
        stats.correct++;
        
        // 播放正确音效（根据开关状态）
        if (settings.soundEnabled) {
            setTimeout(() => { playCorrectSound(); }, 400);
        }
        // 答对时触发更大范围、更密集的烟花
        setTimeout(() => { showBigConfetti(); }, 400);
        // 正确后延迟1秒自动跳转到下一个单词
        setTimeout(() => {
            moveToNextWord();
        }, 1000);
    } else {
        feedback.innerHTML = `<span class="incorrect">✗ 不正确！</span><br>
                              <span class="show-answer">正确答案: ${correctAnswer}</span>`;
        feedback.className = "feedback";
        stats.incorrect++;
        
        // 播放错误音效（根据开关状态）
        if (settings.soundEnabled) {
            playIncorrectSound();
        }
        
        // 添加抖动效果
        russianInput.classList.add('pulse');
        setTimeout(() => {
            russianInput.classList.remove('pulse');
        }, 500);
    }
}

// 移动到下一个单词
function moveToNextWord() {
    if (currentWordIndex < words.length - 1) {
        currentWordIndex++;
        showCurrentWord();
    } else {
        // 显示完成消息
        feedback.innerHTML = `<div class="correct">恭喜！您已完成本级别学习</div>
                              <div>正确: ${stats.correct} | 错误: ${stats.incorrect}</div>`;
        
        // 3秒后返回选择页面
        setTimeout(() => {
            wordLearning.style.display = 'none';
            controlPanel.style.display = 'none';
            // 移除learning-mode类，显示导航栏
            document.body.classList.remove('learning-mode');
            console.log('学习完成，已移除learning-mode类，导航栏应该显示');
            levelSelection.style.display = 'block';
        }, 3000);
    }
}

// 朗读当前单词 - 使用Web Speech API（Safari兼容版）
function speakCurrentWord() {
    const word = words[currentWordIndex];
    
    if (!word.word) {
        return; // 静默失败
    }
    
    // 添加朗读动画效果
    speakButton.classList.add('speaking');
    
    // 使用网络语音播放器
    networkVoicePlayer.speak(word.word).then(success => {
        speakButton.classList.remove('speaking');
        
        if (!success) {
            // 静默失败，不显示任何错误信息
            console.log('语音播放失败，但不影响用户体验');
        }
    });
}

// 更新喇叭按钮状态
function updateSpeakerButtonState() {
    if (settings.speakEnabled) {
        speakButton.classList.remove('disabled');
    } else {
        speakButton.classList.add('disabled');
    }
}

// 播放正确音效
function playCorrectSound() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.setValueAtTime(1320, context.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.start();
    oscillator.stop(context.currentTime + 0.5);
}

// 播放错误音效
function playIncorrectSound() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(220, context.currentTime);
    oscillator.frequency.setValueAtTime(176, context.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.7);
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.start();
    oscillator.stop(context.currentTime + 0.7);
}

// 事件监听器
function initEventListeners() {
    // 返回按钮事件
    backButton.addEventListener('click', () => {
        wordLearning.style.display = 'none';
        controlPanel.style.display = 'none';
        // 移除learning-mode类，显示导航栏
        document.body.classList.remove('learning-mode');
        console.log('已移除learning-mode类，导航栏应该显示');
        
        // 强制显示导航栏
        setTimeout(() => {
            const nav = document.querySelector('.top-nav');
            if (nav) {
                nav.style.display = '';
                nav.style.visibility = '';
                nav.style.opacity = '';
                nav.style.position = '';
                nav.style.left = '';
                nav.style.top = '';
                nav.style.width = '';
                nav.style.height = '';
                nav.style.overflow = '';
                nav.style.pointerEvents = '';
                nav.style.cssText = '';
                console.log('强制显示导航栏');
            }
        }, 100);
        if (wordShowcasePage.style.display === 'none' && showcaseWords.length > 0) {
            // 如果展示页面之前被访问过，返回展示页面
            showWordShowcasePage();
        } else {
            levelSelection.style.display = 'block';
        }
    });
    
    // 上一个单词
    prevButton.addEventListener('click', () => {
        if (currentWordIndex > 0) {
            currentWordIndex--;
            showCurrentWord();
        }
    });
    
    // 下一个单词
    nextButton.addEventListener('click', () => {
        moveToNextWord();
    });
    
    // 输入框回车事件
    russianInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkAnswer();
        }
    });
    
    // 确认按钮事件
    confirmButton.addEventListener('click', () => {
        checkAnswer();
    });
    
    // 朗读按钮事件
    speakButton.addEventListener('click', () => {
        // 检查开关状态
        if (!settings.speakEnabled) {
            feedback.textContent = "请先开启朗读功能";
            feedback.className = "feedback";
            return;
        }
        speakCurrentWord();
    });
    
    // 新增：开关状态变更事件
    speakToggle.addEventListener('change', function() {
        settings.speakEnabled = this.checked;
        
        // 更新喇叭按钮状态
        updateSpeakerButtonState();
        
        if (settings.speakEnabled) {
            feedback.textContent = "朗读功能已开启";
            feedback.className = "feedback";
            setTimeout(() => {
                feedback.textContent = "";
            }, 1500);
        } else {
            feedback.textContent = "朗读功能已关闭";
            feedback.className = "feedback";
            setTimeout(() => {
                feedback.textContent = "";
            }, 1500);
        }
    });
    
    soundToggle.addEventListener('change', function() {
        settings.soundEnabled = this.checked;
        if (settings.soundEnabled) {
            feedback.textContent = "对错音效已开启";
            feedback.className = "feedback";
            setTimeout(() => {
                feedback.textContent = "";
            }, 1500);
        } else {
            feedback.textContent = "对错音效已关闭";
            feedback.className = "feedback";
            setTimeout(() => {
                feedback.textContent = "";
            }, 1500);
        }
    });

    // 上帝模式开关事件
    if (godModeToggle) {
        godModeToggle.addEventListener('change', function() {
            settings.godModeEnabled = this.checked;
        });
    }

    // 新增：点击"开始学习"进入学习页面
    startLearningBtn.addEventListener('click', function() {
        if (showcaseWords.length > 0) {
            startLearning(showcaseWords, showcaseCategoryTitle);
            wordShowcasePage.style.display = 'none';
        }
    });

    // 单词展示页面返回按钮：返回首页
    showcaseBackBtn.addEventListener('click', function() {
        wordShowcasePage.style.display = 'none';
        levelSelection.style.display = 'block';
    });

    // “上帝”按钮事件
    const godButton = document.getElementById('godButton');
    if (godButton) {
        godButton.addEventListener('click', async function() {
            if (words && words[currentWordIndex] && words[currentWordIndex].word) {
                const answer = words[currentWordIndex].word;
                russianInput.value = '';
                russianInput.focus();
                let longPauseIdx = Math.floor(Math.random() * 4) + 6; // 第6-9个字母插入长停顿
                for (let i = 0; i < answer.length; i++) {
                    russianInput.value += answer[i];
                    playKeyboardSound();
                    let delay = 0;
                    if (i === 0 || i === answer.length - 1) {
                        // 首字母和末字母
                        delay = 200 + Math.random() * 150;
                    } else if (i === longPauseIdx && answer.length > 6) {
                        // 长停顿
                        delay = 400 + Math.random() * 300;
                        // 下一个长停顿位置
                        longPauseIdx += Math.floor(Math.random() * 4) + 6;
                    } else {
                        // 普通字母
                        delay = 80 + Math.random() * 140;
                    }
                    await new Promise(res => setTimeout(res, delay));
                }
                // 键入完毕后增加自然停顿
                await new Promise(res => setTimeout(res, 300 + Math.random() * 400));
                playKeyboardSound(3, 'js/huiche.mp3'); // 点击确认按钮时用回车音效，音量更大
                confirmButton.click(); // 自动点击确认按钮
            }
        });
    }

    // 键盘音效函数（支持音量倍数和自定义文件）
    function playKeyboardSound(volumeScale = 1, file = 'js/keyboard.mp3') {
        try {
            const audio = new Audio(file);
            audio.volume = Math.min(1, 0.25 * volumeScale);
            audio.play();
        } catch (e) {}
    }
}

// 新增：渲染单词展示页面
function showWordShowcasePage() {
    // 隐藏其他页面
    levelSelection.style.display = 'none';
    wordLearning.style.display = 'none';
    controlPanel.style.display = 'none';
    // 显示展示页面
    wordShowcasePage.style.display = 'block';
    showcaseTitle.textContent = showcaseCategoryTitle;
    // 渲染所有单词卡片
    wordCardsContainer.innerHTML = '';
    showcaseWords.forEach((word, idx) => {
        // 兼容常见搭配字段和格式
        let collocation = word.collocation || word.collocations || word.phrase || word.phrases || '';
        if (Array.isArray(collocation)) {
            collocation = collocation.join('，');
        }
        if (!collocation) collocation = '-';
        let collocationMeaning = word.collocationMeaning || word.collocationsMeaning || word.phraseMeaning || word.phrasesMeaning || '';
        if (Array.isArray(collocationMeaning)) {
            collocationMeaning = collocationMeaning.join('，');
        }
        if (!collocationMeaning) collocationMeaning = '-';
        let example = word.example || word.examples || '';
        if (Array.isArray(example)) example = example.join('，');
        if (!example) example = '-';
        let exampleMeaning = word.exampleMeaning || word.examplesMeaning || '';
        if (Array.isArray(exampleMeaning)) exampleMeaning = exampleMeaning.join('，');
        if (!exampleMeaning) exampleMeaning = '-';
        let pos = word.pos || word.partOfSpeech || '';
        if (!pos) pos = '-';
        const card = document.createElement('div');
        card.className = 'showcase-word-card';
        card.innerHTML = `
            <button class="showcase-speak-btn" data-idx="${idx}" title="朗读"><i class="fas fa-volume-up"></i></button>
            <div class="showcase-word-main">${word.word || ''}</div>
            <div class="showcase-word-translation">${word.translation || ''}</div>
            <div class="showcase-word-pos">${pos}</div>
            <div class="showcase-word-collocation"><b>常见搭配：</b> ${collocation}</div>
            <div class="showcase-word-collocation-meaning"><b>搭配含义：</b> ${collocationMeaning}</div>
            <div class="showcase-word-example"><b>例句：</b> ${example}</div>
            <div class="showcase-word-example-meaning"><b>例句含义：</b> ${exampleMeaning}</div>
        `;
        wordCardsContainer.appendChild(card);
    });
    // 绑定朗读按钮事件
    wordCardsContainer.querySelectorAll('.showcase-speak-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const idx = this.getAttribute('data-idx');
            const wordObj = showcaseWords[idx];
            if (!wordObj || !wordObj.word) return;
            
            // 使用网络语音播放器
            networkVoicePlayer.speak(wordObj.word);
        });
    });
}

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    init();
    
    // 检查CSS规则是否正确加载
    setTimeout(() => {
        const style = document.createElement('style');
        style.textContent = `
            body.learning-mode .top-nav {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                position: absolute !important;
                left: -9999px !important;
                top: -9999px !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
                pointer-events: none !important;
                z-index: -9999 !important;
            }
        `;
        document.head.appendChild(style);
        console.log('已添加内联CSS规则');
    }, 1000);
}); 

// 登录页面相关JS已移除 

// 在文件末尾添加烟花动画函数
function showFireworks() {
    try {
        const btn = document.getElementById('confirmButton');
        let x = 0.5, y = 0.5; // 默认页面中央
        if (btn) {
            const rect = btn.getBoundingClientRect();
            // 修正y坐标，兼容iPad滚动
            x = (rect.left + rect.width / 2) / window.innerWidth;
            y = (rect.top + rect.height / 2 + window.scrollY) / window.innerHeight;
            if (x < 0 || x > 1 || y < 0 || y > 1) {
                x = 0.5; y = 0.5;
            }
        }
        confetti({
            particleCount: 200,
            angle: 90,
            spread: 160,
            origin: { x, y },
            startVelocity: 45
        });
    } catch (e) {
        confetti({
            particleCount: 200,
            angle: 90,
            spread: 160,
            origin: { x: 0.5, y: 0.5 },
            startVelocity: 45
        });
    }
} 

// 答对时烟花从“确认按钮”处喷发，数量更多，范围更广
function showBigConfetti() {
  if (typeof confetti !== 'function') return;
  const btn = document.getElementById('confirmButton');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const x = (rect.left + rect.width/2) / window.innerWidth;
  const y = (rect.top + rect.height/2) / window.innerHeight;
  for (let i = 0; i < 8; i++) {
    confetti({
      particleCount: 180,
      spread: 180,
      startVelocity: 70,
      origin: {x, y},
      ticks: 100,
      scalar: 1.25
    });
  }
} 