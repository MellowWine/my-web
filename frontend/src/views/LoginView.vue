<template>
    <div class="form-container">
        <h2>登录</h2>
        <form @submit.prevent="handleLogin">
            <div class="form-group">
                <input type="text" v-model="username" placeholder="用户名" required>
            </div>
            <div class="form-group">
                <input type="password" v-model="password" placeholder="密码" required>
            </div>
            <button type="submit">登录</button>
        </form>
        <p v-if="message" class="message error">{{ message }}</p>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const username = ref('');
const password = ref('');
const message = ref('');
const router = useRouter();

const handleLogin = async () => {
    message.value = '';
    try {
        const response = await axios.post('http://localhost:3000/api/login', {
            username: username.value,
            password: password.value,
        });
        localStorage.setItem('token', response.data.token);
        // 使用 replace 防止用户通过后退按钮回到登录页
        await router.replace('/profile');
    } catch (error) {
        message.value = error.response?.data?.message || '登录失败，请检查用户名和密码';
    }
};
</script>