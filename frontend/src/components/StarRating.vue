<template>
    <!-- 只读文本模式：当 textOnly 为 true 时渲染 -->
    <div v-if="textOnly" class="text-only-rating">
        <span>总评分: {{ displayScore }} ({{ ratingCount }}人)</span>
    </div>

    <!-- 原始的交互式星星模式：当 textOnly 为 false 时渲染 -->
    <div v-else class="star-rating" @mouseleave="resetHover">
        <span v-for="star in 5" :key="star" class="star" :class="{
            'is-filled': star <= (hoverScore || localScore),
            'is-readonly': readOnly
        }" @mouseover="!readOnly && (hoverScore = star)" @click="setRating(star)">
            ★
        </span>
        <span v-if="ratingCount > 0" class="rating-info">
            ({{ displayScore }} / {{ ratingCount }}人)
        </span>
    </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, computed, watch } from 'vue';

const props = defineProps({
    score: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    readOnly: { type: Boolean, default: false }, // readOnly 仍然保留，用于禁止非作者但已登录的用户重复评分等场景
    textOnly: { type: Boolean, default: false } // 新增 prop，用于作者视图
});

const emit = defineEmits(['update:score']);

// 使用 ref 来跟踪内部状态，但它的初始值来自 prop
const localScore = ref(props.score);
const hoverScore = ref(0);

// 当外部传入的 score prop 变化时，同步更新内部的 localScore
// 这对于在评分后刷新列表数据很重要
watch(() => props.score, (newScore) => {
    localScore.value = newScore;
});

// toFixed(1) 确保分数总是显示一位小数，如 4.0
const displayScore = computed(() => Number(props.score).toFixed(1));

const setRating = (star) => {
    // 如果是只读模式（比如作者看自己的帖子），则不执行任何操作
    if (props.readOnly || props.textOnly) return;

    // 更新内部状态以提供即时反馈
    localScore.value = star;

    // 通过 emit 事件将新分数传递给父组件
    emit('update:score', star);
};

const resetHover = () => {
    if (props.readOnly || props.textOnly) return;
    hoverScore.value = 0;
};
</script>

<style scoped>
.star-rating {
    display: flex;
    align-items: center;
    gap: 2px;
}

.star {
    font-size: 1.5rem;
    color: #ccc;
    cursor: pointer;
    transition: color 0.2s, transform 0.2s;
}

.star.is-filled {
    color: #ffc107;
    /* 金色 */
}

/* 当组件为只读时，鼠标指针不变 */
.star.is-readonly {
    cursor: not-allowed;
}

/* 交互式星星在非只读时才有悬停效果 */
.star:not(.is-readonly):hover {
    transform: scale(1.2);
}

.rating-info {
    margin-left: 0.5rem;
    font-size: 0.8rem;
    color: var(--sweet-text-light);
}

/* 新增的只读文本模式样式 */
.text-only-rating {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--sweet-text-dark);
    padding: 8px 0;
    /* 给一点垂直空间，让它和星星版本高度差不多 */
}
</style>