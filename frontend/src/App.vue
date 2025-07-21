<template>
  <div id="app-container">
    <header class="top-nav">
      <div class="logo">SweetApp</div>
      <div class="user-actions">
        <template v-if="!isLoggedIn">
          <RouterLink to="/login" class="nav-button">登录</RouterLink>
          <RouterLink to="/register" class="nav-button primary">注册</RouterLink>
        </template>
        <template v-else>
          <span class="welcome-msg">你好, {{ username }}!</span>
          <a href="#" @click.prevent="logout" class="nav-button">退出登录</a>
        </template>
      </div>
    </header>

    <div class="main-layout">
      <aside class="side-nav">
        <nav>
          <RouterLink to="/" class="side-nav-item">
            <span class="icon">🏠</span> 首页
          </RouterLink>
          <RouterLink to="/forum" class="side-nav-item">
            <span class="icon">💬</span> 论坛
          </RouterLink>
          <RouterLink to="/lottery" class="side-nav-item">
            <span class="icon">🎁</span> 每日一抽
          </RouterLink>
          <RouterLink v-if="isLoggedIn" to="/profile" class="side-nav-item">
            <span class="icon">👤</span> 个人主页
          </RouterLink>
        </nav>
      </aside>

      <main class="content-area">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
// 你的 <script setup> 部分不需要改变
import { ref, watch, onMounted } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { jwtDecode } from 'jwt-decode';

const isLoggedIn = ref(false);
const username = ref('');
const route = useRoute();
const router = useRouter();

const updateUserStatus = () => {
  const token = localStorage.getItem('token');
  if (token) { try { const decoded = jwtDecode(token); if (decoded.exp * 1000 > Date.now()) { isLoggedIn.value = true; username.value = decoded.username; } else { logout(false); } } catch (error) { console.error('Invalid token:', error); logout(false); } } else { isLoggedIn.value = false; username.value = ''; }
};
const logout = (redirect = true) => {
  localStorage.removeItem('token');
  isLoggedIn.value = false;
  username.value = '';
  if (redirect) { router.push('/login'); }
};
watch(route, updateUserStatus);
onMounted(updateUserStatus);
</script>

<style scoped>
#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  /* 确保它撑满 #app */
}

.main-layout {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
}

/* 顶部导航栏样式 */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  background: linear-gradient(to right, var(--sweet-pink), var(--sweet-blue));
  flex-shrink: 0;
  padding: 0 16px;
  color: white;
}

.logo {
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
  font-size: 1.2rem;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.welcome-msg {
  display: none;
  color: #f0f0f0;
  font-size: 0.9rem;
}

.nav-button {
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 500;
  transition: background-color 0.2s, opacity 0.2s;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

.nav-button:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.nav-button.primary {
  background: white;
  color: var(--sweet-purple);
  border: none;
}

.nav-button.primary:hover {
  opacity: 0.9;
}

/* 左侧导航栏样式 */
.side-nav {
  display: none;
  background: linear-gradient(to bottom, var(--sweet-pink), var(--sweet-blue));
  padding: 20px 0;
  flex-shrink: 0;
}

.side-nav nav {
  display: flex;
  flex-direction: column;
}

.side-nav-item {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  text-decoration: none;
  font-size: 1rem;
  transition: background-color 0.2s;
  color: white;
  font-weight: 500;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);
}

.side-nav-item:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.side-nav-item .icon {
  margin-right: 12px;
  font-size: 1.2rem;
}

.side-nav-item.router-link-exact-active {
  background-color: rgba(255, 255, 255, 0.3);
  font-weight: bold;
}

.content-area {
  flex-grow: 1;
  overflow-y: auto;
}

/* 大屏幕响应式样式 */
@media (min-width: 768px) {
  .top-nav {
    padding: 0 24px;
  }

  .logo {
    font-size: 1.5rem;
  }

  .welcome-msg {
    display: inline;
  }

  .nav-button {
    padding: 8px 16px;
    font-size: 1rem;
  }

  .side-nav {
    display: block;
    width: 220px;
  }
}
</style>