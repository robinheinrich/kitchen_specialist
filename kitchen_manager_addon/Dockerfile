ARG BUILD_FROM
FROM $BUILD_FROM

# Install requirements for add-on
RUN \
    apk add --no-cache \
    python3 \
    py3-pip \
    dos2unix

WORKDIR /app

# Copy data for add-on
COPY requirements.txt /app/
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

COPY src /app/src

# Copy rootfs
COPY rootfs /

# Fix permissions for proper S6 execution
RUN dos2unix /etc/s6-overlay/s6-rc.d/kitchen_manager/run \
    && chmod a+x /etc/s6-overlay/s6-rc.d/kitchen_manager/run

# No CMD or ENTRYPOINT - Let S6 handle it
