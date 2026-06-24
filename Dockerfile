# Базовый образ ЗАПИННЕН на точную версию ради воспроизводимости прод-сборок:
# новый релиз base не «прилетит» на rebuild и не сломает overlay молча.
# Обновление — только осознанно: поменять тег ниже и прогнать ./check-update.sh.
FROM ghcr.io/snoups/remnashop:v0.8.2

# Overlay admin API files on top of the base image
COPY admin_src/src/ /opt/remnashop/src/

# Точку входа uvicorn переключаем на overlay-обёртку (src/overlay_app.py),
# которая вызывает базовый application() и добавляет admin/public-роуты + таблицы
# поддержки. Если строка точки входа в base изменится и sed не сматчится —
# grep уронит билд сразу (а не молча в рантайме).
RUN sed -i 's#src\.__main__:application#src.overlay_app:application#g' docker-entrypoint.sh \
 && grep -q 'src.overlay_app:application' docker-entrypoint.sh
