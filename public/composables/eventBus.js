// eventBus.js
const eventBus = {
    listeners: {},
    $on(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    },
    $emit(event, data) {
    if (this.listeners[event]) {
        this.listeners[event].forEach(callback => callback(data));
    }
    },
    $off(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      }
    },
  };
  
  export default eventBus;