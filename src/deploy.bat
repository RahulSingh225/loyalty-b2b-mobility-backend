docker build -t spacempact/sturlite-loyalty:uat .
docker push spacempact/sturlite-loyalty:uat
docker pull spacempact/sturlite-loyalty:uat
sudo docker rm -f sturlite
sudo docker run -d   --name sturlite   --network sturlite-net   --env-file env/.env   -p 3000:3000   spacempact/sturlite-loyalty:uat