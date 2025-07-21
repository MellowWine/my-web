<template>
    <div class="forum-page">
        <h1>论坛</h1>
        <p>与社区成员交流想法。</p>

        <!-- 发帖表单 -->
        <div v-if="isLoggedIn" class="post-form">
            <form @submit.prevent="handlePostSubmit">
                <textarea v-model="newPostContent" placeholder="分享你的新鲜事..." rows="4" required></textarea>
                <button type="submit" :disabled="isSubmitting">
                    {{ isSubmitting ? '发布中...' : '发布帖子' }}
                </button>
            </form>
            <p v-if="postError" class="message error">{{ postError }}</p>
        </div>
        <div v-else class="login-prompt">
            <p>请<RouterLink to="/login">登录</RouterLink>后发布帖子。</p>
        </div>

        <!-- 帖子列表 -->
        <div class="posts-list">
            <div v-if="loading" class="loading-spinner">正在加载帖子...</div>
            <div v-else-if="fetchError" class="message error">{{ fetchError }}</div>
            <div v-else-if="posts.length === 0">这里还没有帖子，快来发布第一条吧！</div>

            <div v-else v-for="post in posts" :key="post.id" class="post-card">
                <div class="post-header">
                    <div>
                        <span class="post-author">{{ post.username }}</span>
                        <span class="post-date">{{ formatDateTime(post.created_at) }}</span>
                    </div>
                    <button v-if="isLoggedIn && loggedInUserId === post.user_id" @click="deletePost(post.id)"
                        class="delete-button">
                        删除
                    </button>
                </div>
                <div class="post-content">
                    <p>{{ post.content }}</p>
                </div>
                <div class="post-footer">
                    <!-- 关键的条件渲染逻辑在这里 -->
                    <StarRating :score="post.average_score" :rating-count="post.rating_count"
                        :textOnly="isLoggedIn && loggedInUserId === post.user_id"
                        @update:score="ratePost(post.id, $event)" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { RouterLink } from 'vue-router';
import { jwtDecode } from 'jwt-decode';
import StarRating from '@/components/StarRating.vue'; // 使用 @ 别名导入

const posts = ref([]);
const newPostContent = ref('');
const loading = ref(true);
const isSubmitting = ref(false);
const fetchError = ref('');
const postError = ref('');

// 计算属性判断用户是否登录
const isLoggedIn = computed(() => !!localStorage.getItem('token'));

// 计算属性获取当前登录用户的 ID 和 用户名
const loggedInUser = computed(() => {
    const token = localStorage.getItem('token');
    if (!token) return { id: null, username: null };
    try {
        const decoded = jwtDecode(token);
        return { id: decoded.id, username: decoded.username };
    } catch (error) {
        console.error("Token decoding failed:", error);
        return { id: null, username: null };
    }
});

const loggedInUserId = computed(() => loggedInUser.value.id);
const loggedInUsername = computed(() => loggedInUser.value.username);


// 获取所有帖子
const fetchPosts = async () => {
    try {
        loading.value = true;
        // 使用 axios，因为 apiClient 方案未被采纳
        const response = await axios.get('http://localhost:3000/api/posts');
        posts.value = response.data;
    } catch (error) {
        fetchError.value = '无法加载帖子，请稍后再试。';
        console.error(error);
    } finally {
        loading.value = false;
    }
};

// 提交新帖子
const handlePostSubmit = async () => {
    if (!newPostContent.value.trim()) {
        postError.value = '帖子内容不能为空。';
        return;
    }
    isSubmitting.value = true;
    postError.value = '';
    const token = localStorage.getItem('token');
    try {
        const response = await axios.post('http://localhost:3000/api/posts',
            { content: newPostContent.value },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        // 重新获取所有帖子来保证数据同步，包括自己的新帖子
        fetchPosts();
        newPostContent.value = '';
    } catch (error) {
        postError.value = error.response?.data?.message || '发布失败，请重试。';
    } finally {
        isSubmitting.value = false;
    }
};

// 删除帖子
const deletePost = async (postId) => {
    if (!confirm('你确定要删除这条帖子吗？')) {
        return;
    }
    try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3000/api/posts/${postId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        posts.value = posts.value.filter(p => p.id !== postId);
    } catch (error) {
        console.error('Failed to delete post:', error);
        alert(error.response?.data?.message || '删除失败，请稍后重试。');
    }
};

// 提交评分
const ratePost = async (postId, score) => {
    if (!isLoggedIn.value) {
        alert('请登录后进行评分。');
        return;
    }
    try {
        const token = localStorage.getItem('token');
        await axios.post(
            `http://localhost:3000/api/posts/${postId}/rate`,
            { score },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        // 评分成功后，重新获取所有帖子数据以更新平均分
        fetchPosts();
    } catch (error) {
        alert(error.response?.data?.message || '评分失败。');
    }
};


// 格式化日期时间
const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString('zh-CN', { hour12: false });
};

// 组件挂载时自动加载帖子
onMounted(fetchPosts);
</script>

<style scoped>
.forum-page {
    width: 100%;
    padding: 16px;
    box-sizing: border-box;
}

@media (min-width: 768px) {
    .forum-page {
        padding: 24px;
    }
}

.post-form,
.post-card {
    background-color: var(--sweet-card-bg, #ffffff);
    border: 1px solid var(--sweet-border, #e0e0e0);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.post-form textarea {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    border: 1px solid var(--sweet-border, #ccc);
    border-radius: 6px;
    box-sizing: border-box;
    resize: vertical;
}

.post-form button {
    margin-top: 1rem;
    padding: 10px 20px;
    font-size: 1rem;
    background: linear-gradient(to right, var(--sweet-pink), var(--sweet-blue));
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    float: right;
    transition: opacity 0.2s;
}

.post-form button:hover {
    opacity: 0.9;
}

.post-form button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.login-prompt {
    text-align: center;
    padding: 1.5rem;
    background-color: var(--sweet-card-bg, #f8f9fa);
    border-radius: 8px;
    margin-bottom: 2rem;
}

.posts-list {
    margin-top: 2rem;
}

.post-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 1rem;
    color: var(--sweet-text-light, #6c757d);
    font-size: 0.9rem;
}

.delete-button {
    background: none;
    border: none;
    color: var(--sweet-danger, #F87171);
    cursor: pointer;
    font-size: 0.85rem;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s, color 0.2s;
    align-self: flex-end;
}

.delete-button:hover {
    background-color: var(--sweet-danger, #F87171);
    color: white;
}

.post-author {
    font-weight: bold;
    color: var(--sweet-text-dark, #333);
}

.post-date {
    margin-left: 0;
}

.post-content p {
    margin: 0;
    line-height: 1.6;
    white-space: pre-wrap;
}

.post-footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--sweet-border);
    display: flex;
    justify-content: flex-end;
}

@media (min-width: 768px) {

    .post-form,
    .post-card {
        padding: 1.5rem;
    }

    .post-header {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }

    .delete-button {
        align-self: auto;
    }

    .post-date {
        margin-left: 0.5rem;
    }
}
</style>