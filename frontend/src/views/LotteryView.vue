<template>
    <div class="lottery-container">
        <h1>今日运势抽卡</h1>
        <p>点击下方的卡牌，看看今天适合做什么吧！</p>

        <div class="draw-area">
            <div class="card-back" @click="drawCard" :class="{
                'is-drawing': isDrawing,
                'is-revealed': isRevealed,
                'is-disabled': userPoints < 1 && !isRevealed
            }">
                <span class="card-text">
                    <span v-if="isRevealed">再来一次?</span>
                    <span v-else-if="userPoints < 1">积分不足</span>
                    <span v-else>点击抽卡 (1分)</span>
                </span>
            </div>
            <div class="card-front" :class="{ 'is-revealed': isRevealed }">
                <div class="card-content">
                    <h3>{{ currentResult }}</h3>
                </div>
            </div>
        </div>

        <!-- 移除了独立的 "换一张" 按钮，逻辑合并到卡片点击中 -->

        <div class="history-section">
            <div class="history-header">
                <h2>最近10次记录</h2>
                <button v-if="lotteryHistory.length > 0" @click="clearHistory" class="clear-button"
                    :disabled="isClearing">
                    {{ isClearing ? '清空中...' : '清空记录' }}
                </button>
            </div>
            <div v-if="historyLoading" class="loading-spinner">加载记录中...</div>
            <div v-else-if="historyError" class="message error">{{ historyError }}</div>
            <ul v-else-if="lotteryHistory.length > 0">
                <li v-for="record in lotteryHistory.slice(0, 10)" :key="record.id">
                    <span>{{ record.result }}</span>
                    <span class="history-date">{{ formatDateTime(record.drew_at) }}</span>
                </li>
            </ul>
            <p v-else>你还没有抽过卡哦。</p>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const cardPool = [
    "宜：喝杯奶茶", "忌：看恐怖片", "宜：睡个懒觉", "忌：熬夜加班", "宜：整理房间", "忌：吃得太饱",
    "宜：听一首歌", "忌：钻牛角尖", "宜：给朋友打电话", "忌：沉迷手机", "宜：读几页书", "忌：久坐不动",
    "宜：来一把游戏", "忌：乱花钱", "宜：出门散步", "忌：赖床"
];

const isDrawing = ref(false);
const isRevealed = ref(false);
const currentResult = ref('');
const lotteryHistory = ref([]);
const historyLoading = ref(true);
const historyError = ref('');
const isClearing = ref(false);
const userPoints = ref(0);

const fetchUserPoints = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const response = await axios.get('http://localhost:3000/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        userPoints.value = response.data.user.points;
    } catch (error) {
        console.error('Failed to fetch user points:', error);
    }
};

const drawCard = async () => {
    if (isRevealed.value) {
        resetDraw();
        return;
    }
    if (userPoints.value < 1) {
        alert('积分不足，无法抽卡！去论坛给别人的帖子评分可以获得积分哦。');
        return;
    }
    if (isDrawing.value) return;

    isDrawing.value = true;
    const randomIndex = Math.floor(Math.random() * cardPool.length);
    const result = cardPool[randomIndex];
    currentResult.value = result;

    try {
        const token = localStorage.getItem('token');
        await axios.post('http://localhost:3000/api/lottery/draw', { result }, { headers: { 'Authorization': `Bearer ${token}` } });
        userPoints.value -= 1;
        fetchHistory();
        setTimeout(() => {
            isRevealed.value = true;
            isDrawing.value = false;
        }, 800); // 缩短动画时间
    } catch (error) {
        alert(error.response?.data?.message || '抽卡失败！');
        isDrawing.value = false;
    }
};

const resetDraw = () => {
    isRevealed.value = false;
};

const fetchHistory = async () => {
    historyLoading.value = true;
    historyError.value = '';
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/lottery/history', { headers: { 'Authorization': `Bearer ${token}` } });
        lotteryHistory.value = response.data;
    } catch (error) {
        historyError.value = '无法加载抽奖记录。';
    } finally {
        historyLoading.value = false;
    }
};

const clearHistory = async () => {
    if (!confirm('你确定要清空所有抽卡记录吗？这个操作无法撤销。')) return;
    isClearing.value = true;
    try {
        const token = localStorage.getItem('token');
        await axios.delete('http://localhost:3000/api/lottery/history', { headers: { 'Authorization': `Bearer ${token}` } });
        lotteryHistory.value = [];
        alert('抽卡记录已成功清空！');
    } catch (error) {
        alert('清空记录失败，请稍后再试。');
    } finally {
        isClearing.value = false;
    }
};

const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString('zh-CN', { hour12: false });
};

onMounted(() => {
    fetchHistory();
    fetchUserPoints();
});
</script>

<style scoped>
.lottery-container {
    text-align: center;
    padding: 16px;
    box-sizing: border-box;
}

@media (min-width: 768px) {
    .lottery-container {
        padding: 24px;
    }
}

.draw-area {
    position: relative;
    margin: 1.5rem auto;
    perspective: 1000px;
    width: 180px;
    height: 270px;
}

.card-back,
.card-front {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 15px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: transform 0.8s;
    backface-visibility: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
}

.card-back {
    background: linear-gradient(135deg, var(--sweet-pink, #FBCFE8) 0%, var(--sweet-blue, #BFDBFE) 100%);
    color: white;
    font-size: 1.5rem;
    font-weight: bold;
    transform: rotateY(0deg);
}

.card-front {
    background: var(--sweet-card-bg, #fff);
    color: var(--sweet-text-dark, #333);
    transform: rotateY(180deg);
}

.card-content {
    padding: 20px;
}

.draw-area .card-back.is-revealed {
    transform: rotateY(-180deg);
}

.draw-area .card-front.is-revealed {
    transform: rotateY(0deg);
}

.card-back.is-drawing {
    animation: shake 0.5s infinite;
}

.draw-area:hover .card-back:not(.is-drawing):not(.is-disabled) {
    transform: scale(1.05);
}

.card-back.is-disabled {
    background: #BDBDBD;
    cursor: not-allowed;
}

.history-section {
    margin-top: 3rem;
    text-align: left;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--sweet-border, #eee);
    padding-bottom: 0.5rem;
    margin-bottom: 1.5rem;
}

.history-header h2 {
    margin: 0;
}

.clear-button {
    padding: 6px 12px;
    font-size: 0.9rem;
    background-color: var(--sweet-danger, #F87171);
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.clear-button:hover {
    background-color: #ef4444;
}

.clear-button:disabled {
    background-color: #f5c6cb;
    cursor: not-allowed;
}

.history-section ul {
    list-style: none;
    padding: 0;
}

.history-section li {
    background-color: var(--sweet-card-bg, #f8f9fa);
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
}

.history-date {
    font-size: 0.8rem;
    color: var(--sweet-text-light, #6c757d);
}

@keyframes shake {

    0%,
    100% {
        transform: translateX(0);
    }

    25% {
        transform: translateX(-5px);
    }

    75% {
        transform: translateX(5px);
    }
}

@media (min-width: 768px) {
    .draw-area {
        width: 200px;
        height: 300px;
    }

    .history-section li {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
}
</style>