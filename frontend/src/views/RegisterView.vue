<template>
    <div class="form-container">
        <h2>创建你的账户</h2>
        <form @submit.prevent="handleRegister">
            <div class="form-group">
                <input type="text" v-model="username" placeholder="用户名" required>
            </div>
            <div class="form-group">
                <input type="password" v-model="password" placeholder="密码" required>
            </div>
            <button type="submit">注册</button>
        </form>
        <p v-if="message" :class="messageClass">{{ message }}</p>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const username = ref('');
const password = ref('');
const message = ref('');
const isError = ref(false);
const router = useRouter();

const messageClass = computed(() => ({
    'message': true,
    'error': isError.value,
    'success': !isError.value
}));

const handleRegister = async () => {
    isError.value = false;
    message.value = '';
    try {
        await axios.post('import.meta.env.VITE_API_URL;/api/register', {
            username: username.value,
            password: password.value,
        });
        message.value = '注册成功！即将跳转到登录页面...';
        setTimeout(() => router.push('/login'), 2000);
    } catch (error) {
        isError.value = true;
        message.value = error.response?.data?.message || '注册失败，请稍后再试';
    }
};
</script>