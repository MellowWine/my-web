// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/forum',
      name: 'forum',
      // 懒加载组件
      component: () => import('../views/ForumView.vue')
    },
    {
  path: '/lottery',
  name: 'lottery',
  component: () => import('../views/LotteryView.vue'),
  meta: { requiresAuth: true } // 标记为需要登录
},
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true } // 添加元信息，表示需要登录
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (to.meta.requiresAuth && !token) {
    // 如果目标路由需要认证但用户未登录，则重定向到登录页
    next('/login');
  } else {
    next();
  }
});

export default router