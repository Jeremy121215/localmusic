// 工具箱模块
(function() {
    function initToolbox() {
        const toolboxBtn = document.getElementById('toolboxBtn');
        const toolboxModal = document.getElementById('toolboxModal');
        const toolboxClose = document.getElementById('toolboxClose');
        const customMusicTool = document.getElementById('customMusicTool');
        const customMusicPanel = document.getElementById('customMusicPanel');
        const backToToolbox = document.getElementById('backToToolbox');
        const customMusicForm = document.getElementById('customMusicForm');
        const generateZipBtn = document.getElementById('generateZipBtn');

        if (toolboxBtn) {
            toolboxBtn.addEventListener('click', () => {
                toolboxModal.classList.add('show');
            });
        }

        if (toolboxClose) {
            toolboxClose.addEventListener('click', () => {
                toolboxModal.classList.remove('show');
            });
        }

        if (toolboxModal) {
            toolboxModal.addEventListener('click', (e) => {
                if (e.target === toolboxModal) {
                    toolboxModal.classList.remove('show');
                }
            });
        }

        if (customMusicTool) {
            customMusicTool.addEventListener('click', () => {
                toolboxModal.classList.remove('show');
                setTimeout(() => {
                    customMusicPanel.classList.add('show');
                }, 200);
            });
        }

        if (document.getElementById('musicDownloadTool')) {
            document.getElementById('musicDownloadTool').addEventListener('click', () => {
                window.open('https://jeremy121215.github.io/download/download.html?category=music', '_blank');
                toolboxModal.classList.remove('show');
            });
        }

        // 控制滚动歌词选项的显示/隐藏
        if (document.getElementById('customHasLyric')) {
            const customHasLyric = document.getElementById('customHasLyric');
            const scrollLyricGroup = document.getElementById('scrollLyricGroup');
            const customLyrics = document.getElementById('customLyrics');

            customHasLyric.addEventListener('change', () => {
                if (customHasLyric.value === 'true') {
                    scrollLyricGroup.style.display = 'block';
                    customLyrics.disabled = false;
                } else {
                    scrollLyricGroup.style.display = 'none';
                    customLyrics.disabled = true;
                }
            });

            // 初始化状态
            if (customHasLyric.value === 'true') {
                scrollLyricGroup.style.display = 'block';
                customLyrics.disabled = false;
            } else {
                scrollLyricGroup.style.display = 'none';
                customLyrics.disabled = true;
            }
        }

        if (backToToolbox) {
            backToToolbox.addEventListener('click', () => {
                customMusicPanel.classList.remove('show');
            });
        }

        if (customMusicForm) {
            customMusicForm.addEventListener('submit', handleGenerateZip);
        }

        async function handleGenerateZip(e) {
            e.preventDefault();

            const songName = document.getElementById('customSongName').value.trim();
            const artist = document.getElementById('customArtist').value.trim();
            const hasLyric = document.getElementById('customHasLyric').value === 'true';
            const isScrollLyric = hasLyric ? document.getElementById('customScrollLyric').value === 'true' : false;
            const lyricsText = document.getElementById('customLyrics').value.trim();
            const audioFile = document.getElementById('customAudioFile').files[0];
            const coverFile = document.getElementById('customCoverFile').files[0];

            if (!songName) {
                alert('请输入歌曲名称');
                return;
            }

            if (!audioFile) {
                alert('请选择音频文件');
                return;
            }

            generateZipBtn.disabled = true;
            generateZipBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在生成...';

            try {
                const zip = new JSZip();

                const folder = zip.folder(songName);

                const audioExt = audioFile.name.split('.').pop();
                const audioFileName = `${songName}.${audioExt}`;
                folder.file(audioFileName, audioFile);

                let coverFileName = null;
                if (coverFile) {
                    const coverExt = coverFile.name.split('.').pop();
                    coverFileName = `${songName}.${coverExt}`;
                    folder.file(coverFileName, coverFile);
                }

                let lyricContent = '';
                if (hasLyric && lyricsText) {
                    // 所有歌词都直接使用输入内容，不添加时间标签
                    lyricContent = lyricsText;
                }

                const songData = {
                    song: [{
                        song_name: songName,
                        song_author: artist || '未知艺术家',
                        song_file: audioFileName,
                        cover_file: coverFileName,
                        has_scroll_lyric: isScrollLyric,
                        song_lyric: lyricContent
                    }]
                };

                folder.file('song.json', JSON.stringify(songData, null, 2));

                const content = await zip.generateAsync({
                    type: 'blob',
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 }
                });

                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${songName}.lm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                alert(`已成功生成 ${songName}.lm`);
                customMusicForm.reset();
                customMusicPanel.classList.remove('show');

            } catch (error) {
                console.error('生成LM失败:', error);
                alert(`生成LM失败: ${error.message}`);
            } finally {
                generateZipBtn.disabled = false;
                generateZipBtn.innerHTML = '<i class="fas fa-file-archive"></i> 生成LM文件';
            }
        }

        function convertLyricsToFormat(text) {
            const lines = text.split('\n').filter(line => line.trim());
            let result = '';
            let currentTime = 0;

            for (const line of lines) {
                const minutes = Math.floor(currentTime / 60);
                const seconds = Math.floor(currentTime % 60);
                const milliseconds = Math.floor((currentTime % 1) * 100);

                const timeStr = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}]`;

                result += timeStr + line.trim() + '\n';

                currentTime += 3;
            }

            return result;
        }

        console.log('工具箱模块已加载');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initToolbox);
    } else {
        initToolbox();
    }
})();
