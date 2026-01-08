// app.js

// 全局变量
let audioContext;
let audioElement;
let currentSongIndex = -1;
let playlist = [];
let playbackMode = 'random'; // order, single, random
let isPlaying = false;
let currentLyrics = [];
let visibleLyricsCount = 7;
let lyricLineHeight = 44;
let isTouching = false;
let lastActiveLyricIndex = -1;
let lyricsAutoScrollInterval = null;
let wasPausedByUser = false;
let lastScrolledLyricIndex = -1;
let lyricsUpdateInterval = null;

// DOM元素
const coverContainer = document.getElementById('coverContainer');
const coverImage = document.getElementById('coverImage');
const defaultCover = document.getElementById('defaultCover');
const songTitle = document.getElementById('songTitle');
const songArtist = document.getElementById('songArtist');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const progressBar = document.getElementById('progressBar');
const progress = document.getElementById('progress');
const progressHandle = document.getElementById('progressHandle');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const openFileBtn = document.getElementById('openFileBtn');
const openFolderBtn = document.getElementById('openFolderBtn');
const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
const playlistScroll = document.getElementById('playlistScroll');
const playlistEmpty = document.getElementById('playlistEmpty');
const playlistCount = document.getElementById('playlistCount');
const shufflePlaylistBtn = document.getElementById('shufflePlaylistBtn');
const lyricsScroll = document.getElementById('lyricsScroll');
const lyricsEmpty = document.getElementById('lyricsEmpty');
const modeOrderBtn = document.getElementById('modeOrder');
const modeSingleBtn = document.getElementById('modeSingle');
const modeRandomBtn = document.getElementById('modeRandom');
const loadingSpinner = document.getElementById('loadingSpinner');

// 初始化
function init() {
    console.log("初始化音乐播放器...");
    
    // 创建音频元素
    audioElement = new Audio();
    audioElement.crossOrigin = "anonymous";
    
    // 设置音频事件监听
    audioElement.addEventListener('loadedmetadata', updateSongInfo);
    audioElement.addEventListener('timeupdate', updateProgress);
    audioElement.addEventListener('ended', handleSongEnd);
    audioElement.addEventListener('error', handleAudioError);
    
    // 按钮事件监听
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', playPrevSong);
    nextBtn.addEventListener('click', playNextSong);
    
    // 进度条事件监听
    progressBar.addEventListener('click', seekToPosition);
    
    // 文件操作事件监听
    openFileBtn.addEventListener('click', () => {
        console.log("点击打开文件按钮");
        fileInput.click();
    });
    
    openFolderBtn.addEventListener('click', () => {
        console.log("点击打开文件夹按钮");
        folderInput.click();
    });
    
    fileInput.addEventListener('change', handleFileSelect);
    folderInput.addEventListener('change', handleFolderSelect);
    
    clearPlaylistBtn.addEventListener('click', clearPlaylist);
    shufflePlaylistBtn.addEventListener('click', shufflePlaylist);
    
    // 播放模式事件监听
    modeOrderBtn.addEventListener('click', () => setPlaybackMode('order'));
    modeSingleBtn.addEventListener('click', () => setPlaybackMode('single'));
    modeRandomBtn.addEventListener('click', () => setPlaybackMode('random'));
    
    // 计算歌词行高
    calculateLyricLineHeight();
    
    // 初始化播放列表
    updatePlaylistDisplay();
    
    // 初始化音频上下文
    initAudioContext();
    
    // 初始化触摸事件
    initTouchEvents();
    
    // 监听窗口大小变化
    window.addEventListener('resize', calculateLyricLineHeight);
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    console.log("音乐播放器初始化完成");
}

// 初始化音频上下文
function initAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.warn('Web Audio API 不支持:', e);
    }
}

// 计算歌词行高
function calculateLyricLineHeight() {
    // 根据屏幕尺寸调整可见歌词数量
    if (window.innerWidth <= 480) {
        visibleLyricsCount = 5;
    } else if (window.innerHeight <= 500) {
        visibleLyricsCount = 3;
    } else {
        visibleLyricsCount = 7;
    }
    
    // 计算歌词行高
    const tempLine = document.createElement('div');
    tempLine.className = 'lyric-line';
    tempLine.textContent = '测试文本';
    tempLine.style.position = 'absolute';
    tempLine.style.visibility = 'hidden';
    document.body.appendChild(tempLine);
    
    const height = tempLine.offsetHeight;
    if (height > 0) {
        lyricLineHeight = height + 10;
    }
    
    document.body.removeChild(tempLine);
    
    console.log(`歌词行高: ${lyricLineHeight}px, 可见行数: ${visibleLyricsCount}`);
}

// 处理文件选择
async function handleFileSelect(event) {
    console.log("处理文件选择");
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    // 清空文件输入
    event.target.value = '';
    
    // 显示加载指示器
    showLoading(true);
    
    // 处理ZIP/LM文件
    for (const file of files) {
        if (file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.lm')) {
            await processZipFile(file);
        } else {
            console.warn(`跳过不支持的文件: ${file.name}`);
        }
    }
    
    // 隐藏加载指示器
    showLoading(false);
    
    // 如果有歌曲添加到播放列表，播放第一首
    if (playlist.length > 0 && currentSongIndex === -1) {
        playSong(0);
    }
}

// 处理文件夹选择
async function handleFolderSelect(event) {
    console.log("处理文件夹选择");
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    // 清空文件输入
    event.target.value = '';
    
    // 显示加载指示器
    showLoading(true);
    
    // 找出ZIP/LM文件
    const zipFiles = files.filter(file => file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.lm'));
    
    if (zipFiles.length === 0) {
        alert("选择的文件夹中没有ZIP文件");
        showLoading(false);
        return;
    }
    
    console.log(`找到 ${zipFiles.length} 个ZIP文件`);
    
    // 处理每个ZIP文件
    for (const file of zipFiles) {
        await processZipFile(file);
    }
    
    // 隐藏加载指示器
    showLoading(false);
    
    // 如果有歌曲添加到播放列表，播放第一首
    if (playlist.length > 0 && currentSongIndex === -1) {
        playSong(0);
    }
}

// 处理ZIP文件
async function processZipFile(zipFile) {
    try {
        console.log(`处理ZIP文件: ${zipFile.name}`);
        
        // 使用JSZip解压
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(zipFile);
        
        // 查找song.json文件
        const jsonFile = Object.keys(zipContent.files).find(name => 
            name.toLowerCase().includes('song.json'));
        
        if (!jsonFile) {
            console.warn(`ZIP文件 ${zipFile.name} 中未找到song.json`);
            alert(`ZIP文件 ${zipFile.name} 中未找到song.json文件`);
            return;
        }
        
        // 读取JSON文件
        const jsonContent = await zipContent.files[jsonFile].async('string');
        let songData;
        
        try {
            songData = JSON.parse(jsonContent);
        } catch (e) {
            console.error(`解析song.json失败: ${e}`);
            alert(`ZIP文件 ${zipFile.name} 中的song.json格式错误`);
            return;
        }
        
        // 验证歌曲数据 - 支持 songs 和 song 两种格式
        let songsArray = [];
        if (songData.songs && Array.isArray(songData.songs)) {
            songsArray = songData.songs;
        } else if (songData.song && Array.isArray(songData.song)) {
            songsArray = songData.song;
        } else {
            console.warn(`song.json格式不正确`);
            alert(`ZIP文件 ${zipFile.name} 中的song.json格式不正确`);
            return;
        }

        console.log(`找到 ${songsArray.length} 首歌曲`);

        // 处理每首歌曲
        let addedCount = 0;
        for (const song of songsArray) {
            // 验证必要字段
            if (!song.song_name || !song.song_file) {
                console.warn('歌曲缺少必要字段，跳过');
                continue;
            }

            // 从ZIP中提取音频文件
            const audioFileName = song.song_file;
            console.log(`查找音频文件: "${audioFileName}"`);

            // 调试：显示ZIP中的所有文件
            const allFiles = Object.keys(zipContent.files);
            
            // 查找音频文件 - 大小写不敏感 + 支持子目录
            let audioFileNameLower = audioFileName.toLowerCase();
            let audioFile = null;
            
            // 1. 直接匹配
            audioFile = zipContent.files[audioFileName];
            
            // 2. 如果没找到，尝试去掉目录前缀后匹配
            if (!audioFile || audioFile.dir) {
                const pureFileName = audioFileName.split('/').pop();
                const pureFileNameLower = pureFileName.toLowerCase();
                const matchedName = allFiles.find(name => name.split('/').pop().toLowerCase() === pureFileNameLower);
                if (matchedName) {
                    audioFile = zipContent.files[matchedName];
                    console.log(`找到音频文件: ${matchedName}`);
                }
            }
            
            if (!audioFile || audioFile.dir) {
                console.warn(`音频文件未找到: ${audioFileName}`);
                console.log(`ZIP中的文件: ${allFiles.join(', ')}`);
                continue;
            }

            if (!audioFile || audioFile.dir) {
                console.warn(`音频文件未找到: ${audioFileName}`);
                continue;
            }
            
            // 提取封面文件（如果有）- 支持子目录查找
            let coverUrl = null;
            if (song.cover_file) {
                console.log(`查找封面文件: ${song.cover_file}`);
                const allFileNames = Object.keys(zipContent.files);
                const coverFileName = song.cover_file;
                const coverFileNameLower = coverFileName.toLowerCase();
                
                // 1. 先尝试直接匹配
                let matchedCoverName = allFileNames.find(name => name.toLowerCase() === coverFileNameLower);
                
                // 2. 如果没找到，尝试在子目录中查找（获取纯文件名）
                if (!matchedCoverName) {
                    const pureFileName = coverFileName.split('/').pop();
                    const pureFileNameLower = pureFileName.toLowerCase();
                    matchedCoverName = allFileNames.find(name => name.split('/').pop().toLowerCase() === pureFileNameLower);
                }
                
                if (matchedCoverName) {
                    const coverFile = zipContent.files[matchedCoverName];
                    console.log(`找到封面文件: ${matchedCoverName}`);
                    const coverBlob = await coverFile.async('blob');
                    coverUrl = URL.createObjectURL(coverBlob);
                    console.log(`封面Blob URL创建成功: ${coverUrl.substring(0, 50)}...`);
                } else {
                    console.warn(`封面文件未找到: ${coverFileName}`);
                    console.log(`ZIP中的文件: ${allFileNames.join(', ')}`);
                }
            } else {
                console.log(`歌曲没有指定封面文件`);
            }
            
            // 创建音频Blob URL
            const audioBlob = await audioFile.async('blob');
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // 解析歌词（如果有）
            const lyrics = parseLyrics(song.song_lyric || '');
            
            // 添加到播放列表
            playlist.push({
                id: Date.now() + Math.random(),
                title: song.song_name,
                artist: song.song_author || '未知艺术家',
                audioUrl: audioUrl,
                coverUrl: coverUrl,
                lyrics: lyrics,
                hasScrollLyric: song.has_scroll_lyric || false,
                duration: 0, // 将在加载音频后设置
                zipName: zipFile.name.replace('.zip', '').replace('.lm', '')
            });
            
            addedCount++;
        }
        
        // 更新播放列表显示
        updatePlaylistDisplay();
        
        // 如果是第一次加载歌曲，初始化封面
        if (addedCount > 0) {
            const wasEmpty = currentSongIndex === -1;
            if (wasEmpty) {
                initializeCover(0);
            }
        }
        
        console.log(`从 ${zipFile.name} 添加了 ${addedCount} 首歌曲`);
        
    } catch (error) {
        console.error('处理ZIP文件时出错:', error);
        alert(`处理文件 ${zipFile.name} 时出错: ${error.message}`);
    }
}

// 解析歌词
function parseLyrics(lyricText) {
    if (!lyricText) return [];
    
    const lines = lyricText.split('\n');
    const lyrics = [];
    
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    for (const line of lines) {
        const match = line.match(timeRegex);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3].length === 2 ? match[3] + '0' : match[3]);
            const time = minutes * 60 + seconds + milliseconds / 1000;
            
            const text = line.replace(timeRegex, '').trim();
            if (text) {
                lyrics.push({ time, text });
            }
        } else if (line.trim()) {
            // 没有时间标签的歌词行
            lyrics.push({ time: null, text: line.trim() });
        }
    }
    
    // 按时间排序
    lyrics.sort((a, b) => {
        if (a.time === null) return 1;
        if (b.time === null) return -1;
        return a.time - b.time;
    });
    
    return lyrics;
}

// 初始化封面显示（不播放）
function initializeCover(index) {
    if (index < 0 || index >= playlist.length) return;
    
    const song = playlist[index];
    
    // 更新歌曲信息显示
    songTitle.textContent = song.title;
    songArtist.textContent = song.artist;
    
    // 设置封面
    if (song.coverUrl) {
        console.log("设置封面 URL:", song.coverUrl);
        coverImage.onload = function() {
            console.log("封面图片加载成功");
        };
        coverImage.onerror = function() {
            console.error("封面图片加载失败:", song.coverUrl);
        };
        coverImage.src = song.coverUrl;
        coverImage.style.display = 'block';
        defaultCover.style.display = 'none';
    } else {
        console.log("歌曲没有封面文件");
        coverImage.style.display = 'none';
        defaultCover.style.display = 'flex';
    }
    
    // 更新歌词显示
    updateLyricsDisplay();
    
    console.log("封面已初始化:", song.title);
}

// 播放歌曲
async function playSong(index) {
    if (index < 0 || index >= playlist.length) {
        console.warn("无效的歌曲索引:", index);
        return;
    }
    
    console.log(`播放歌曲 ${index}: ${playlist[index].title}`);
    
    // 停止当前播放
    if (audioElement) {
        audioElement.pause();
        isPlaying = false;
        playIcon.className = 'fas fa-play';
        coverContainer.classList.remove('playing');
    }
    
    // 重置歌词状态
    lastActiveLyricIndex = -1;
    lastScrolledLyricIndex = -1;
    if (lyricsUpdateInterval) {
        clearInterval(lyricsUpdateInterval);
        lyricsUpdateInterval = null;
    }

    stopLyricsAutoScroll();
    
    // 更新当前歌曲索引
    currentSongIndex = index;
    const song = playlist[index];
    
    // 更新UI
    songTitle.textContent = song.title;
    songArtist.textContent = song.artist;
    
    // 设置音频源
    audioElement.src = song.audioUrl;
    
    // 重置歌词
    currentLyrics = [];
    
    try {
        // 加载音频
        await audioElement.load();
        
        // 更新播放列表高亮
        updatePlaylistDisplay();
        
        // 更新封面
        if (song.coverUrl) {
            console.log("播放时设置封面 URL:", song.coverUrl);
            coverImage.onload = function() {
                console.log("播放时封面图片加载成功");
            };
            coverImage.onerror = function(e) {
                console.error("播放时封面图片加载失败:", song.coverUrl, e);
            };
            coverImage.src = song.coverUrl;
            coverImage.style.display = 'block';
            defaultCover.style.display = 'none';
        } else {
            console.log("播放时歌曲没有封面文件");
            coverImage.style.display = 'none';
            defaultCover.style.display = 'flex';
        }
        
        // 更新歌词显示
        updateLyricsDisplay();
        
        // 播放
        await audioElement.play();
        isPlaying = true;
        playIcon.className = 'fas fa-pause';
        coverContainer.classList.add('playing');
        
        // 开始歌词更新循环
        startLyricsUpdate();

        // 开始歌词自动滚动
        startLyricsAutoScroll();
        
        console.log("开始播放歌曲");
    } catch (error) {
        console.error('播放失败:', error);
        isPlaying = false;
        playIcon.className = 'fas fa-play';
        alert(`播放失败: ${error.message}`);
    }
}

// 开始歌词更新循环
function startLyricsUpdate() {
    if (lyricsUpdateInterval) {
        clearInterval(lyricsUpdateInterval);
    }
    
    // 每50ms更新一次歌词，确保流畅
    lyricsUpdateInterval = setInterval(() => {
        if (isPlaying && currentLyrics.length > 0) {
            updateLyricsHighlight();
        }
    }, 50);
}

// 切换播放/暂停
function togglePlayPause() {
    if (!playlist.length || currentSongIndex === -1) {
        alert("请先添加歌曲到播放列表");
        return;
    }

    if (isPlaying) {
        audioElement.pause();
        playIcon.className = 'fas fa-play';
        coverContainer.classList.remove('playing');
        isPlaying = false;
        wasPausedByUser = true;

        if (lyricsUpdateInterval) {
            clearInterval(lyricsUpdateInterval);
            lyricsUpdateInterval = null;
        }

        stopLyricsAutoScroll();
    } else {
        audioElement.play().then(() => {
            playIcon.className = 'fas fa-pause';
            coverContainer.classList.add('playing');
            isPlaying = true;

            startLyricsUpdate();
            startLyricsAutoScroll();
        }).catch(error => {
            console.error('播放失败:', error);
            alert(`播放失败: ${error.message}`);
        });
    }
}

// 播放上一首
function playPrevSong() {
    if (playlist.length === 0) return;
    
    let prevIndex;
    
    if (playbackMode === 'random') {
        prevIndex = Math.floor(Math.random() * playlist.length);
    } else {
        prevIndex = currentSongIndex - 1;
        if (prevIndex < 0) prevIndex = playlist.length - 1;
    }
    
    playSong(prevIndex);
}

// 播放下一首
function playNextSong() {
    if (playlist.length === 0) return;
    
    let nextIndex;
    
    switch (playbackMode) {
        case 'single':
            nextIndex = currentSongIndex;
            break;
        case 'random':
            nextIndex = Math.floor(Math.random() * playlist.length);
            break;
        case 'order':
        default:
            nextIndex = currentSongIndex + 1;
            if (nextIndex >= playlist.length) nextIndex = 0;
            break;
    }
    
    playSong(nextIndex);
}

// 歌曲结束处理
function handleSongEnd() {
    if (playbackMode === 'single') {
        // 单曲循环，重新播放当前歌曲
        audioElement.currentTime = 0;
        audioElement.play();
    } else {
        // 播放下一首
        playNextSong();
    }
}

// 设置播放模式
function setPlaybackMode(mode) {
    playbackMode = mode;
    
    // 更新按钮状态
    modeOrderBtn.classList.remove('active');
    modeSingleBtn.classList.remove('active');
    modeRandomBtn.classList.remove('active');
    
    if (mode === 'order') modeOrderBtn.classList.add('active');
    else if (mode === 'single') modeSingleBtn.classList.add('active');
    else if (mode === 'random') modeRandomBtn.classList.add('active');
    
    console.log(`播放模式设置为: ${mode}`);
}

// 更新歌曲信息
function updateSongInfo() {
    const song = playlist[currentSongIndex];
    if (song) {
        song.duration = audioElement.duration;
        totalTimeEl.textContent = formatTime(audioElement.duration);
        updatePlaylistDisplay();
    }
}

// 更新进度条
function updateProgress() {
    if (!audioElement.duration) return;
    
    const progressPercent = (audioElement.currentTime / audioElement.duration) * 100;
    progress.style.width = `${progressPercent}%`;
    progressHandle.style.left = `${progressPercent}%`;
    
    currentTimeEl.textContent = formatTime(audioElement.currentTime);
    
    // 更新歌词高亮（这里也会调用，但为了双重保险）
    if (currentLyrics.length > 0) {
        updateLyricsHighlight();
    }
}

// 跳转到指定位置
function seekToPosition(event) {
    if (!audioElement.duration) return;
    
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    const seekPercent = Math.min(Math.max(clickX / width, 0), 1);
    
    audioElement.currentTime = seekPercent * audioElement.duration;
    
    // 更新进度条
    progress.style.width = `${seekPercent * 100}%`;
    progressHandle.style.left = `${seekPercent * 100}%`;
    
    // 强制更新歌词显示
    if (currentLyrics.length > 0) {
        updateLyricsHighlight();
    }
}

// 更新播放列表显示
function updatePlaylistDisplay() {
    playlistScroll.innerHTML = '';
    
    if (playlist.length === 0) {
        playlistEmpty.style.display = 'flex';
        playlistScroll.appendChild(playlistEmpty);
        playlistCount.textContent = '0 首歌曲';
        return;
    }
    
    playlistEmpty.style.display = 'none';
    
    playlist.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = `playlist-item ${index === currentSongIndex ? 'active' : ''}`;
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-song-btn')) {
                console.log(`点击播放列表项: ${index}`);
                playSong(index);
            }
        });
        
        item.innerHTML = `
            <div class="playlist-item-index">${index + 1}</div>
            <div class="playlist-item-info">
                <div class="playlist-item-title">${song.title}</div>
                <div class="playlist-item-artist">${song.artist} • ${song.zipName}</div>
            </div>
            <div class="playlist-item-duration">${song.duration ? formatTime(song.duration) : '--:--'}</div>
            <button class="delete-song-btn" data-index="${index}" title="删除歌曲">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        const deleteBtn = item.querySelector('.delete-song-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSong(index);
        });
        
        playlistScroll.appendChild(item);
    });
    
    playlistCount.textContent = `${playlist.length} 首歌曲`;
}

// 更新歌词显示 - 只显示部分歌词
function updateLyricsDisplay() {
    lyricsScroll.innerHTML = '';
    
    const song = playlist[currentSongIndex];
    if (!song || !song.lyrics || song.lyrics.length === 0) {
        lyricsEmpty.style.display = 'flex';
        lyricsScroll.appendChild(lyricsEmpty);
        return;
    }
    
    lyricsEmpty.style.display = 'none';
    
    // 保存完整歌词
    currentLyrics = song.lyrics;
    
    // 初始显示前几行歌词
    renderLyricsSegment(0);
}

// 渲染歌词片段
function renderLyricsSegment(activeIndex) {
    lyricsScroll.innerHTML = '';

    if (activeIndex < 0 || activeIndex >= currentLyrics.length) return;

    const containerHeight = lyricsScroll.clientHeight;
    const targetPosition = containerHeight * 0.45;

    const linesAbove = 3;
    const linesBelow = 3;

    let start = Math.max(0, activeIndex - linesAbove);
    let end = Math.min(currentLyrics.length, activeIndex + linesBelow + 1);

    for (let i = start; i < end; i++) {
        const lyric = currentLyrics[i];
        const line = document.createElement('div');
        line.className = 'lyric-line';
        line.dataset.index = i;
        line.dataset.time = lyric.time;

        if (i === activeIndex) {
            line.classList.add('active');
        }

        const textSpan = document.createElement('span');
        textSpan.className = 'lyric-text';
        textSpan.textContent = lyric.text;
        line.appendChild(textSpan);

        lyricsScroll.appendChild(line);
    }

    let accumulatedHeight = 0;
    for (let i = start; i < activeIndex; i++) {
        const line = lyricsScroll.querySelector(`[data-index="${i}"]`);
        if (line) {
            accumulatedHeight += line.offsetHeight;
        }
    }

    const paddingTop = targetPosition - accumulatedHeight;
    lyricsScroll.style.paddingTop = `${Math.max(0, paddingTop)}px`;
}

// 格式化歌词时间
function formatLyricTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

// 更新歌词高亮
function updateLyricsHighlight() {
    if (!audioElement || !audioElement.duration || !currentLyrics.length) {
        return;
    }
    
    const currentTime = audioElement.currentTime;
    
    let activeIndex = -1;
    for (let i = 0; i < currentLyrics.length; i++) {
        if (currentLyrics[i].time !== null && currentLyrics[i].time <= currentTime) {
            if (i === currentLyrics.length - 1 || 
                currentLyrics[i + 1].time === null || 
                currentLyrics[i + 1].time > currentTime) {
                activeIndex = i;
                break;
            }
        }
    }
    
    if (activeIndex === -1 && currentLyrics.length > 0) {
        activeIndex = 0;
    }
    
    if (activeIndex !== lastActiveLyricIndex) {
        lastActiveLyricIndex = activeIndex;
        renderLyricsSegment(activeIndex);
    }
}

function startLyricsAutoScroll() {
    if (lyricsAutoScrollInterval) return;

    lyricsAutoScrollInterval = setInterval(() => {
        updateLyricsHighlight();
    }, 50);
}

function stopLyricsAutoScroll() {
    if (lyricsAutoScrollInterval) {
        clearInterval(lyricsAutoScrollInterval);
        lyricsAutoScrollInterval = null;
    }
}

// 删除单个歌曲
function deleteSong(index) {
    if (index < 0 || index >= playlist.length) return;
    
    const song = playlist[index];
    if (!confirm(`确定要删除歌曲《${song.title}》吗？`)) return;
    
    // 如果删除的是当前播放的歌曲，停止播放
    if (index === currentSongIndex && isPlaying) {
        audioElement.pause();
        isPlaying = false;
        playIcon.className = 'fas fa-play';
        coverContainer.classList.remove('playing');
        
        if (lyricsUpdateInterval) {
            clearInterval(lyricsUpdateInterval);
            lyricsUpdateInterval = null;
        }
        stopLyricsAutoScroll();
    }
    
    // 如果删除的是当前歌曲之前的歌曲，调整当前索引
    if (index < currentSongIndex) {
        currentSongIndex--;
    }
    // 如果删除的是当前歌曲，重置索引
    else if (index === currentSongIndex) {
        currentSongIndex = -1;
    }
    
    // 释放Blob URL
    if (song.audioUrl) URL.revokeObjectURL(song.audioUrl);
    if (song.coverUrl) URL.revokeObjectURL(song.coverUrl);
    
    // 从播放列表中移除
    playlist.splice(index, 1);
    
    // 更新显示
    updatePlaylistDisplay();
    updateLyricsDisplay();
    
    // 更新播放计数
    playlistCount.textContent = `${playlist.length} 首歌曲`;
    
    console.log(`已删除歌曲: ${song.title}`);
}

// 清空播放列表
function clearPlaylist() {
    if (playlist.length === 0) return;
    
    if (confirm(`确定要清空播放列表吗？共${playlist.length}首歌曲`)) {
        // 停止播放
        if (audioElement) {
            audioElement.pause();
            audioElement.src = '';
        }
        
        // 停止歌词更新循环
        if (lyricsUpdateInterval) {
            clearInterval(lyricsUpdateInterval);
            lyricsUpdateInterval = null;
        }

        stopLyricsAutoScroll();
        
        // 释放Blob URL
        playlist.forEach(song => {
            if (song.audioUrl) URL.revokeObjectURL(song.audioUrl);
            if (song.coverUrl) URL.revokeObjectURL(song.coverUrl);
        });
        
        // 重置播放列表
        playlist = [];
        currentSongIndex = -1;
        isPlaying = false;
        playIcon.className = 'fas fa-play';
        coverContainer.classList.remove('playing');
        lastActiveLyricIndex = -1;
        currentLyrics = [];
        
        // 重置UI
        songTitle.textContent = '请选择音乐文件';
        songArtist.textContent = '等待加载...';
        currentTimeEl.textContent = '00:00';
        totalTimeEl.textContent = '00:00';
        progress.style.width = '0%';
        coverImage.style.display = 'none';
        defaultCover.style.display = 'flex';
        
        // 更新显示
        updatePlaylistDisplay();
        updateLyricsDisplay();
        
        console.log('播放列表已清空');
    }
}

// 随机播放播放列表
function shufflePlaylist() {
    if (playlist.length < 2) {
        alert("播放列表中至少需要2首歌曲才能随机排序");
        return;
    }
    
    // Fisher-Yates洗牌算法
    for (let i = playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
    
    // 如果当前正在播放歌曲，更新索引
    if (currentSongIndex >= 0) {
        const currentSongId = playlist[currentSongIndex]?.id;
        const newIndex = playlist.findIndex(song => song.id === currentSongId);
        currentSongIndex = newIndex;
    }
    
    updatePlaylistDisplay();
    console.log('播放列表已随机排序');
}

// 处理音频错误
function handleAudioError(error) {
    console.error('音频播放错误:', error);
    
    // 停止歌词更新循环
    if (lyricsUpdateInterval) {
        clearInterval(lyricsUpdateInterval);
        lyricsUpdateInterval = null;
    }
    
    // 尝试播放下一首
    if (playlist.length > 0) {
        setTimeout(() => playNextSong(), 1000);
    }
}

// 格式化时间 (秒 -> MM:SS)
function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 显示/隐藏加载指示器
function showLoading(show) {
    if (show) {
        loadingSpinner.style.display = 'block';
    } else {
        loadingSpinner.style.display = 'none';
    }
}

// 初始化触摸事件
function initTouchEvents() {
    // 进度条触摸支持
    progressBar.addEventListener('touchstart', handleTouchStart);
    progressBar.addEventListener('touchmove', handleTouchMove);
    progressBar.addEventListener('touchend', handleTouchEnd);
    
    // 防止歌词区域滚动时触发页面滚动
    lyricsScroll.addEventListener('touchstart', function(e) {
        if (lyricsScroll.scrollHeight > lyricsScroll.clientHeight) {
            e.stopPropagation();
        }
    }, { passive: false });
    
    // 防止移动端下拉刷新
    let startY = 0;
    
    document.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
        // 如果正在触摸进度条，不阻止默认行为
        if (isTouching) return;
        
        const touchY = e.touches[0].clientY;
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        
        // 如果在顶部并且向下拉，阻止默认行为防止下拉刷新
        if (scrollTop === 0 && touchY > startY) {
            e.preventDefault();
        }
    }, { passive: false });
}

// 触摸事件处理
function handleTouchStart(e) {
    isTouching = true;
    seekToTouch(e);
}

function handleTouchMove(e) {
    if (isTouching) {
        e.preventDefault();
        seekToTouch(e);
    }
}

function handleTouchEnd() {
    isTouching = false;
    setTimeout(() => {
        progressHandle.style.opacity = '0';
    }, 1000);
}

// 触摸跳转
function seekToTouch(e) {
    if (!audioElement.duration) return;
    
    const touch = e.touches[0];
    const rect = progressBar.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const width = rect.width;
    const seekPercent = Math.min(Math.max(touchX / width, 0), 1);
    
    audioElement.currentTime = seekPercent * audioElement.duration;
    
    // 更新进度条
    progress.style.width = `${seekPercent * 100}%`;
    progressHandle.style.left = `${seekPercent * 100}%`;
    progressHandle.style.opacity = '1';
    
    // 强制更新歌词显示
    if (currentLyrics.length > 0) {
        updateLyricsHighlight();
    }
}

// 处理页面可见性变化
function handleVisibilityChange() {
    if (document.hidden) {
        // 页面不可见时，仅暂停歌词更新以节省资源，但继续播放音频
        if (lyricsUpdateInterval) {
            clearInterval(lyricsUpdateInterval);
            lyricsUpdateInterval = null;
        }
    } else if (!document.hidden && currentSongIndex >= 0) {
        // 页面重新可见时，恢复歌词更新
        if (isPlaying) {
            startLyricsUpdate();
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM已加载完成");
    init();
});

// 页面关闭前清理资源
window.addEventListener('beforeunload', () => {
    // 释放所有Blob URL
    playlist.forEach(song => {
        if (song.audioUrl) URL.revokeObjectURL(song.audioUrl);
        if (song.coverUrl) URL.revokeObjectURL(song.coverUrl);
    });
    
    // 停止歌词更新循环
    if (lyricsUpdateInterval) {
        clearInterval(lyricsUpdateInterval);
        lyricsUpdateInterval = null;
    }
    
    // 关闭音频上下文
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
    }
});
