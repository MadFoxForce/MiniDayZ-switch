// Save Manager for MiniDayZ
// Handles game saves using localStorage

class SaveManager {
  constructor() {
    this.saveKey = 'minidayz_save';
    this.autoSaveInterval = 30000; // Auto-save every 30 seconds
    this.autoSaveTimer = null;
    this.init();
  }

  init() {
    // Try to load save on initialization
    this.loadOnStart();
    
    // Setup auto-save
    this.startAutoSave();
    
    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.saveOnExit();
    });
    
    // Save on visibility change (when tab becomes hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveOnExit();
      }
    });
  }

  // Save game state
  save(gameState) {
    try {
      const saveData = {
        timestamp: Date.now(),
        version: '1.0',
        gameVersion: 'Plus 1.2',
        data: gameState
      };
      
      const jsonData = JSON.stringify(saveData);
      localStorage.setItem(this.saveKey, jsonData);
      
      console.log('Игра сохранена:', new Date(saveData.timestamp).toLocaleString());
      return true;
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      
      // If localStorage is full, try to clear old data
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage переполнен, попытка очистки старых данных...');
        this.clearOldSaves();
        return this.save(gameState);
      }
      
      return false;
    }
  }

  // Load save
  load() {
    try {
      const jsonData = localStorage.getItem(this.saveKey);
      if (!jsonData) {
        return null;
      }

      const saveData = JSON.parse(jsonData);
      console.log('Игра загружена:', new Date(saveData.timestamp).toLocaleString());
      return saveData.data;
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      return null;
    }
  }

  // Check if save exists
  hasSave() {
    return localStorage.getItem(this.saveKey) !== null;
  }

  // Delete save
  deleteSave() {
    localStorage.removeItem(this.saveKey);
    console.log('Сохранение удалено');
  }

  // Auto-save - работает через Construct 2 систему сохранений
  autoSave() {
    // Construct 2 сохраняет автоматически, нам нужно только синхронизировать
    // Проверяем наличие сохранений Construct 2 и копируем их в наш формат
    try {
      // Проверяем IndexedDB
      if (window.indexedDB) {
        const request = indexedDB.open("_C2SaveStates");
        request.onsuccess = (e) => {
          const db = e.target.result;
          if (db) {
            const transaction = db.transaction(["saves"], "readonly");
            const objectStore = transaction.objectStore("saves");
            const getAllRequest = objectStore.getAll();
            getAllRequest.onsuccess = (event) => {
              const saves = event.target.result;
              if (saves && saves.length > 0) {
                // Берем последнее сохранение
                const latestSave = saves[saves.length - 1];
                if (latestSave && latestSave.data) {
                  // Сохраняем копию в наш формат для совместимости
                  const backupData = {
                    timestamp: Date.now(),
                    version: '1.0',
                    gameVersion: 'Plus 1.2',
                    data: latestSave.data,
                    c2slot: latestSave.slot
                  };
                  localStorage.setItem(this.saveKey + '_backup', JSON.stringify(backupData));
                }
              }
            };
          }
        };
      }
      
      // Также проверяем localStorage с префиксом __c2save_
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('__c2save_')) {
          const c2Save = localStorage.getItem(key);
          if (c2Save) {
            // Создаем резервную копию
            const backupData = {
              timestamp: Date.now(),
              version: '1.0',
              gameVersion: 'Plus 1.2',
              data: c2Save,
              c2slot: key.replace('__c2save_', '')
            };
            localStorage.setItem(this.saveKey + '_backup', JSON.stringify(backupData));
            break; // Берем первое найденное сохранение
          }
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setInterval(() => {
      this.autoSave();
    }, this.autoSaveInterval);
  }

  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  // Save on exit
  saveOnExit() {
    this.autoSave();
  }

  // Load on start - Construct 2 загружает автоматически, нам не нужно вмешиваться
  loadOnStart() {
    // Construct 2 сам загружает сохранения при старте
    // Мы просто логируем наличие сохранений
    try {
      let hasC2Save = false;
      
      // Проверяем IndexedDB
      if (window.indexedDB) {
        const request = indexedDB.open("_C2SaveStates");
        request.onsuccess = (e) => {
          const db = e.target.result;
          if (db) {
            const transaction = db.transaction(["saves"], "readonly");
            const objectStore = transaction.objectStore("saves");
            const countRequest = objectStore.count();
            countRequest.onsuccess = (event) => {
              if (event.target.result > 0) {
                console.log('MiniDayZ: Найдены сохранения Construct 2 в IndexedDB');
              }
            };
          }
        };
      }
      
      // Проверяем localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('__c2save_')) {
          hasC2Save = true;
          break;
        }
      }
      
      if (hasC2Save) {
        console.log('MiniDayZ: Найдены сохранения Construct 2 в localStorage');
      }
    } catch (e) {
      // Silent fail
    }
  }

  // Clear old saves (if needed)
  clearOldSaves() {
    try {
      // Clear all localStorage items that start with our prefix
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('minidayz_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.warn('Очищено старых сохранений:', keysToRemove.length);
    } catch (error) {
      console.error('Ошибка при очистке:', error);
    }
  }

  // Export save (optional)
  exportSave() {
    const jsonData = localStorage.getItem(this.saveKey);
    if (jsonData) {
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `minidayz_save_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('Сохранение экспортировано');
    }
  }

  // Import save (optional)
  importSave(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const saveData = JSON.parse(e.target.result);
        localStorage.setItem(this.saveKey, JSON.stringify(saveData));
        console.log('Сохранение импортировано');
        
        // Reload page to apply save
        if (confirm('Сохранение импортировано. Перезагрузить страницу для применения?')) {
          location.reload();
        }
      } catch (error) {
        console.error('Ошибка импорта:', error);
        alert('Ошибка при импорте сохранения: ' + error.message);
      }
    };
    reader.onerror = () => {
      alert('Ошибка при чтении файла');
    };
    reader.readAsText(file);
  }

  // Get save info
  getSaveInfo() {
    const jsonData = localStorage.getItem(this.saveKey);
    if (!jsonData) {
      return null;
    }

    try {
      const saveData = JSON.parse(jsonData);
      return {
        timestamp: saveData.timestamp,
        version: saveData.version,
        gameVersion: saveData.gameVersion || 'Unknown',
        size: new Blob([jsonData]).size
      };
    } catch (error) {
      return null;
    }
  }
}

// Create global instance
window.saveManager = new SaveManager();

// Helper functions for game integration
window.getGameState = function() {
  // This function should be implemented by the game
  // It should return the current game state object
  if (window.cr && window.cr_getRuntime) {
    try {
      const runtime = window.cr_getRuntime();
      if (runtime && runtime.getGameState) {
        return runtime.getGameState();
      }
    } catch (e) {
      console.warn('Не удалось получить состояние игры:', e);
    }
  }
  return null;
};

window.restoreGameState = function(gameState) {
  // This function should be implemented by the game
  // It should restore the game state from the provided object
  if (window.cr && window.cr_getRuntime) {
    try {
      const runtime = window.cr_getRuntime();
      if (runtime && runtime.restoreGameState) {
        runtime.restoreGameState(gameState);
        return true;
      }
    } catch (e) {
      console.warn('Не удалось восстановить состояние игры:', e);
    }
  }
  return false;
};

