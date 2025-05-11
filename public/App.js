// App.js
import { useRealTime } from './composables/useRealTime.js';
import router from '../router/index.js';

export default {
  template: `
    <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <!-- Navigation Bar -->
      <nav class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-14 items-center">
            <div class="flex items-center">
              <!-- Logo -->
              <router-link to="/" class="flex-shrink-0 flex items-center text-blue-500 dark:text-blue-400 font-semibold text-xl tracking-tight">
                DistillFrame.com
              </router-link>

              <!-- Desktop Menu -->
              <div class="hidden sm:ml-6 sm:flex sm:space-x-6">
                <router-link
                  to="/"
                  class="text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 px-3 py-2 text-sm font-medium transition-colors duration-200 rounded-md"
                  :class="{ 'text-blue-500 dark:text-blue-400': $route.path === '/' || $route.name === 'landingWithChannel' }"
                >
                  Home
                </router-link>
              </div>
            </div>

            <!-- Right Side: Connection Status, Pi-link, and Dark Mode Toggle -->
            <div class="flex items-center space-x-4">
              <!-- Connection Status Dot -->
              <div
                class="h-4 w-4 rounded-full"
                :class="connectionStatusClass"
                title="Connection Status"
              ></div>

              <!-- Pi-link Copy URL Button -->
              <button
                @click="copyUrlToClipboard"
                class="text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 p-2 rounded-md"
                title="Copy URL to Clipboard"
                aria-label="Copy URL to Clipboard"
              >
                <i class="pi pi-link text-xl"></i>
              </button>

              <!-- Dark Mode Toggle -->
              <button
                @click="toggleDarkMode"
                class="text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 p-2 rounded-md"
                title="Toggle Dark Mode"
              >
                <svg v-if="darkMode" class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <svg v-else class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </button>

              <!-- Mobile Menu Button -->
              <div class="flex sm:hidden items-center">
                <button @click="toggleMenu" type="button" class="text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 p-2 rounded-md">
                  <span class="sr-only">Open main menu</span>
                  <svg v-if="!menuOpen" class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <svg v-else class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Menu -->
        <div class="sm:hidden" v-show="menuOpen">
          <div class="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <router-link
              to="/"
              class="block px-3 py-2 text-base font-medium text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              :class="{ 'text-blue-500 dark:text-blue-400': $route.path === '/' || $route.name === 'landingWithChannel' }"
            >
              Home
            </router-link>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <router-view :darkMode="darkMode"></router-view>
      </main>
    </div>
  `,
  setup() {
    console.log('App.js setup called');
    const { isConnected, connectionStatus } = useRealTime();
    const menuOpen = Vue.ref(false);
    const darkMode = Vue.ref(false);

    function toggleMenu() {
      menuOpen.value = !menuOpen.value;
    }

    function toggleDarkMode() {
      darkMode.value = !darkMode.value;
      if (darkMode.value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    function copyUrlToClipboard() {
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        alert('URL copied to clipboard!');
      }).catch((err) => {
        console.error('Failed to copy URL:', err);
        alert('Failed to copy URL.');
      });
    }

    const connectionStatusClass = Vue.computed(() => {
      if (connectionStatus.value === 'connected') return 'bg-green-500';
      if (connectionStatus.value === 'connecting') return 'bg-yellow-500';
      return 'bg-gray-500';
    });

    Vue.onMounted(() => {
      console.log('App.js mounted');
      const savedDarkMode = localStorage.getItem('darkMode');
      if (savedDarkMode === 'true') {
        darkMode.value = true;
        document.documentElement.classList.add('dark');
      }
    });

    Vue.onUnmounted(() => {
      console.log('App.js unmounted');
    });

    Vue.watch(darkMode, (newValue) => {
      localStorage.setItem('darkMode', newValue);
    });

    return {
      menuOpen,
      toggleMenu,
      darkMode,
      toggleDarkMode,
      connectionStatusClass,
      copyUrlToClipboard,
    };
  },
};