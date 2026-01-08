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
                    lyricContent = convertLyricsToFormat(lyricsText);
                }

                const songData = {
                    song: [{
                        song_name: songName,
                        song_author: artist || '未知艺术家',
                        song_file: audioFileName,
                        cover_file: coverFileName,
                        has_scroll_lyric: hasLyric,
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
                a.download = `${songName}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                alert(`已成功生成 ${songName}.zip`);
                customMusicForm.reset();
                customMusicPanel.classList.remove('show');

            } catch (error) {
                console.error('生成ZIP失败:', error);
                alert(`生成ZIP失败: ${error.message}`);
            } finally {
                generateZipBtn.disabled = false;
                generateZipBtn.innerHTML = '<i class="fas fa-file-archive"></i> 生成ZIP文件';
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
