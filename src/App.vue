<script setup lang="ts"></script>

<template>
  <div id="header">
    <div id="navigator">
      <router-link to="/generate">生成图片</router-link>
      <router-link to="/modeling">生成模型</router-link>
      <router-link to="/management">模型管理</router-link>
    </div>
  </div>
  <router-view />
</template>

<style lang="css" scoped>
#header {
  display: flex;
  align-items: center;
  justify-content: center;
}

#navigator {
  background-color: #f5f5f5;
  border-radius: 20px;
  padding: 8px 10px;
  margin: 20px;
  font-size: 15px;
  z-index: 10;
}

#navigator a {
  margin: 0 10px;
  text-decoration: none;
  color: #333;
}

#navigator a:hover {
  color: #000;
  font-weight: bold;
}

#navigator a.router-link-exact-active {
  color: #000;
  font-weight: bold;
  border-bottom: 2px solid #000;
}

#main {
  flex-grow: 1;
}
</style>

<style>
#app {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
