FROM nginx
MAINTAINER peixinyi
# 设置时区
RUN echo 'Asia/Shanghai' >/etc/timezone
# 拷贝成品
COPY dist /usr/share/nginx/html
# 暴露端口
EXPOSE 80