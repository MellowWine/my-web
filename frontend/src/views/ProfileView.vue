<template>
    <div class="profile-page">
        <div v-if="loading" class="loading-spinner">加载中...</div>
        <div v-else-if="error" class.message="error">{{ error }}</div>
        <div v-else-if="profile" class="profile-content">
            <header class="profile-header">
                <h1>你好, {{ profile.user.username }}!</h1>
                <div class="points-display">
                    你的积分: <span>{{ profile.user.points }}</span>
                </div>
            </header>
            <div class="lottery-history-section">
                <h2>我的抽卡记录</h2>
                <ul v-if="profile.lotteryHistory.length > 0">
                    <li v-for="record in profile.lotteryHistory" :key="record.id">
                        <span>{{ record.result }}</span>
                        <span class="history-date">{{ formatDateTime(record.drew_at) }}</span>
                    </li>
                </ul>
                <p v-else>你还没有抽过卡，去【每日一抽】试试手气吧！</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const profile = ref(null);
const loading = ref(true);
const error = ref('');
const router = useRouter();

onMounted(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        router.push('/login');
        return;
    }

    try {
        const response = await axios.get('http://localhost:3000/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        profile.value = response.data;
    } catch (err) {
        // 根据错误类型提供更具体的信息
        if (err.response && err.response.status === 404) {
            error.value = '获取用户信息失败 (API not found)。请确认后端服务已是最新版本并已重启。';
        } else {
            error.value = '获取用户信息失败，请重新登录。';
        }
        localStorage.removeItem('token'); // 清除无效 token
    } finally {
        loading.value = false;
    }
});

const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString('zh-CN', { hour12: false });
};
</script>

<style scoped>
.profile-page {
    width: 100%;
    padding: 16px;
    box-sizing: border-box;
}

.loading-spinner {
    text-align: center;
    padding: 2rem;
    font-size: 1.2rem;
    color: #555;
}

.profile-header {
    background: var(--sweet-card-bg);
    padding: 2rem;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    margin-bottom: 2rem;
}

.points-display {
    margin-top: 1rem;
    font-size: 1.2rem;
    color: var(--sweet-text-light);
}

.points-display span {
    font-weight: bold;
    color: var(--sweet-purple);
    font-size: 1.5rem;
    margin-left: 8px;
}

.lottery-history-section {
    background: var(--sweet-card-bg);
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.lottery-history-section h2 {
    margin-top: 0;
    border-bottom: 1px solid var(--sweet-border);
    padding-bottom: 1rem;
    margin-bottom: 1rem;
}

.lottery-history-section ul {
    list-style: none;
    padding: 0;
    max-height: 400px;
    overflow-y: auto;
}

.lottery-history-section li {
    padding: 0.75rem;
    border-bottom: 1px solid var(--sweet-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.lottery-history-section li:last-child {
    border-bottom: none;
}

.history-date {
    font-size: 0.8rem;
    color: var(--sweet-text-light);
    flex-shrink: 0;
    margin-left: 1rem;
}

@media (min-width: 768px) {
    .profile-page {
        padding: 24px;
    }
}
</style>