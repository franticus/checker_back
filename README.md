# Инструкции по использованию проекта

Эти инструкции помогут вам запустить проект на вашем локальном компьютере для разработки и тестирования.

## Шаги для запуска проекта

1. **Скачать/склонировать проект**

   - Если у вас уже есть ссылка на репозиторий, используйте `git clone https://github.com/franticus/checker_back.git` для клонирования проекта на ваш компьютер.
   - Если у вас есть zip файл проекта, просто распакуйте его в удобное для вас место.

2. **Открыть папку с проектом**

   - Перейдите в папку проекта.

3. **Запустить установку зависимостей**

   - В терминале, находясь в папке проекта, выполните команду `npm i`. Это установит все необходимые зависимости.

4. **Запуск проекта**

   - После установки зависимостей запустите проект, выполнив команду `npm run start` в терминале.

5. **Проверка работы сервера**

   - После запуска в терминале должно появиться сообщение о том, что сервер запущен.

6. **Открытие сайта**
   - После запуска сервера, сайт https://checkersite.netlify.app/ для проверки zip файлов автоматически откроется в вашем браузере.

### В версии v2.1.0 происходят следующие проверки:

- Проверка на битые ссылки.
- Проверка на якорные ссылки.
- Проверка дублирования meta-тегов.
- Проверка form (required, checkbox, action, name).
- Проверка resize у textarea.

### Планируется:

- Проверка на одинаковые email и номер телефона.
- Проверка на битые пути картинок.