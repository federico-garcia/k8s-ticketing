## What do you need to run k8s in your machine?

1. Download Docker [here](https://www.docker.com/products/docker-desktop)
2. Once docker is installed, open Docker preferences, go to the Kubernetes section and Enable kubernetes, click Apply and Save!
3. Open a terminal window to verify k8s is installed.

```shell
kubectl version
```

K8s expects we have docker images for all apps we want to run in the cluster. MOst fo our apps are node.js apps, so, this Dockerfile will work for most of them.

```Dockerfile
FROM node:12-alpine

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

#ARG PORT=3000
#ENV PORT $PORT
#EXPOSE $PORT 9229 9230

RUN mkdir /opt/node_app && chown node:node /opt/node_app
WORKDIR /opt/node_app

USER node
COPY package.json package-lock.json* ./
RUN npm install --no-optional && npm cache clean --force
ENV PATH /opt/node_app/node_modules/.bin:$PATH

WORKDIR /opt/node_app/app
COPY . .

CMD [ "npm", "start" ]
```

#### generating docker images

Go to the folder where the `Dockerfile` is located and run this command:

```shell
docker build -t <image-name>:<tag> .
docker build -t blog-app/posts:0.0.1 .
```

#### Running a container based on the image

If you want to have access from your machine to the app running on a given port inside the container, you need to publish the container's port to the host (your machine). e.g In this case, the app is running on port 4000 inside the container and we want to get access to the app in our local machine in the same port (http://localhost:4000).

By default, Docker tries to find the image in your machine, if not found, then it goes to docker hub.

```shell
docker run <options> <image-name>
docker run -p <host-port>:<container-port> <more-options> <image-name>
docker run -p 4000:4000 blog-app/posts
```

#### Running all components of a app

if you need to run all the components that are part of your app, you need to create a `docker-compose.yml` file where you can describe what images you want to use or build for the different components of your app. Once that file is ready, getting to run all those services at the same time is as easy as typing:

```
docker-compose build
docker-compose up
docker-compose up --build
docker-compose ps
docker-compose down
```

Note: if there is a frontend making calls to backend services, make sure you publish the ports of those backend services to the host (you need to start those services on different ports) and add the name of the containers of those backend services to `/etc/hosts`. e.g `0.0.0.0 <container-name>`

Note: There are some ports that browsers block by default. Don't use those for your services!! I ran into a connection issue when using port 6000, 30 mins of my life wasted[reference](https://stackoverflow.com/questions/4313403/why-do-browsers-block-some-ports/22622633#22622633)

#### Useful Docker Commands

```shell
docker build -t <image-name>:<tag> . # build an image based on a Dockerfile
docker exec -it <container> <command> # execute a command inside a running container
docker stop <container> #stop a container
docker rm <container> #remove a container
docker rmi <image> #remove an image
docker ps #list of containers running
docker ps -a #list of containers running/stopped
docker logs <container> # print logs from a container
```

### Kubernetes (k8s)

- k8s cluster. collection of nodes + a master to manage them
- Node. a VM that runs containers
- Pod. Smallest k8s deployment unit, runs one or more containers.
- Deployment. Monitors a set of pods to make sure the requested # are always running.
- Service. Provides an URL to access a running container.

In k8s, we basically send configuration files, written in YAML, to the k8s cluster to create k8s objects. e.g pods, deployments, services, etc. These files must be part of the project source code repo. Do not create objects via direct cli commands.

```sh
kubectl apply -f <YAML-file>
kubectl apply -f posts.yaml
```

Note: It's better if you use the k8s that comes with Docker since k8s will have access to the Docker local registry. If you use minikube, there are some changes you have to make to build the images and make them visible to k8s, see [here](https://dzone.com/articles/running-local-docker-images-in-kubernetes-1) for a 'quick' solution.

To point your terminal to use the docker daemon inside minikube run this:
```sh
eval $(minikube docker-env)
```
now any ‘docker’ command you run in this current terminal will run against the docker inside minikube cluster.

**Tip**: Remember to turn off the `imagePullPolicy: Always` (use `imagePullPolicy: IfNotPresent` or `imagePullPolicy: Never`) in your yaml file. Otherwise Kubernetes won’t use your locally build image and it will pull from the network.

Note: If you use an image without a specific tag, e.g `image: blog-app/posts` or `image: blog-app/posts:latest`, k8s will try to get that image from Docker hub. During development, we should use a specific version, other than latest, to work with our local images instead. e.g `image: blog-app/posts:0.0.1`

#### Deployments

Deployment objects in k8s allow you to manage (create, update, delete) pods in the cluster. They are in charge of:

- making sure the exact # of pod copies you specify are running at all times in the cluster
- deploying new pod versions (new image) and the strategy we use for that purpose

```shell
kubectl apply -f posts-dpl.yaml #applying changes to a dpl
kubectl get deployments #listing all deployments
kubectl describe deployment <dpl-name> #printing more info about the dpl
kubectl delete deployment <dpl-name> #deleting a given dpl and all their pods
kubectl rollout restart deployment <dpl-name> #Rolling new pod updates
```

#### Services

Service are k8s objects that allow communication between pods and access to them from outside the cluster. There are different type of services:

- Cluster IP. Only exposes pods in the cluster.
- Node Port. Makes a pod available from outside the cluster. Mostly used for development purposes. e.g Use the NodePort to access the service from outside the cluster: localhost:<NodePort>
- Load Balancer. Preferred way to make a pod available from outside the cluster.
  - load balancer service. Tells k8s to reach out to its provider (AWS, GC, Digital Ocean or Azure) and provision a load balancer (lives outside the k8s cluster). Get traffic in to a single pod. e.g. [ingress-nginx](https://github.com/kubernetes/ingress-nginx) it has different installation scripts for different k8s providers.
  - ingress controller. a pod (inside the k8s cluster) with a set of routing rules to distribute traffic to other services (pod + clusterIP service).
- External Name. redirects an in-cluster requests to a CNAME url

```
kubectl get services
kubectl describe service <srv-name>
```
#### Kubernetes Objects - Labels and Selectors

[Syntax and character set](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)

#### Automating local development with [Skaffold](https://skaffold.dev)

Installing Skaffold
```shell
brew install skaffold
```
Setting up your project (run it in the root folder of the app)
```shell
skaffold init
```
It creates a `skaffold.yaml` config file for your projects where it lists all docker images that are part of the project and the location of all k8s manifests files.

Enable continuous local development on an application
```shell
skaffold dev 
```
hitting `Ctrl+C` will cancel the skaffold process and in turn will remove all deployed k8s object in the cluster
```

#### Useful k8s Commands

```shell
# Add an alias in your shell profile to avoid typing kubectl every time you want to run a command in k8s
# alias k="kubectl"
kubectl version # is server ok?
kubectl apply -f <config-file> #creating objects defined in a file
kubectl apply -f . #creating objects defined in all yaml files in the current folder
kubectl get pods # listing pods
kubectl exec -it <pod-name> <cmd> # running a cmd inside a pod
kubectl logs <pod-name> # Printing logs from a pod
kubectl delete pod <pod-name> #deleting pods
kubectl describe pod <pod-name> #getting detailed info about a pod
```

#### Development Workflow

In your local machine

1. Make changes to code for a given service
2. Commit code to a git branch (other than master/main)
3. Push branch to github

In Github

4. Github receives updated branch
5. Manually create a PR to merge changes into master/main
6. Github automatically runs tests for project (Github actions). `on: pull_requests`
   - Github workflows are executed in parallel. Instead of creating just one heavy one, consider splitting the work into multiple config files to speed up this process and to run tests just for the service/component that is changing, instead of testing the whole app.
   - If the repo contains multiple services, we may want to run specific tests when a service's code changes instead of running all tests for all services when any of them changes, for this, we can take advantage of the `paths` option under the events (`on`) section of the workflow configuration file.
7. After all tests are green, you merge the PR
8. Since master/main branch has changed, Github builds and deploys the service. `on: push: branches: master`. You may want to set-up a separate deployment workflow for each service to avoid deploying all services when just one or a few of them change. We may need two or more folders to separate k8s configuration files we can apply to k8s cluster in different environments: local, stage and prod. e.g ingress (since domains will be different)
   - Deployment strategy using github actions.
     - build the docker image. If you `runs-on: ubuntu-latest`, Docker comes pre-installed. It's a probably a good idea to have different `Dockerfile` for development and production since you may want to run the app in debug mode in dev and build a more production-ready app for live site.
     - push the docker image to the image registry. Use github secrets to store any sensitive information and use them as `ENV` variables in the workflow script.
     - connect to the k8s cluster in production
     - execute `kubectl rollout restart deployment <dpl-name>`. Since the latest docker image was updated, the service in production will pull it from the docker image registry.
   - Provider options for a production k8s cluster (to manage multiple providers, local and cloud, we use `kubectl context`):
     - Digital Ocean.
       - [doctl](https://github.com/digitalocean/doctl) command-line tool
         - doctl auth init
         - doctl kubernetes cluster kubeconfig save <cluster-name>
         - kubectl config view
         - kubectl config use-context <context-name>
     - AWS EKS.
     - Google GKE.
     - Azure.

Note: for manual testing, we could have another branch called `test` or `staging` and a new cluster for each one of those branches. Github will deploy changes on those k8s clusters every time we push code to those branches. Once changes are validated, we merge them to `master/main` and get them deploy to production.

#### Minikube
Starting local cluster
```sh
minikube start
```
Accessing apps
```sh
kubectl get services
minikube service --url <service-name>
```
In order to enable ingress on macOS
```
minikube config set vm-driver hyperkit
minikube delete
minikube start
minikube addons enable ingress
```

#### Using AWS Elastic Container Registry (ECR)
Each account comes with a Container registry by default. Cannot have more than one registry per account.
1. Retrieve an authentication token and authenticate your Docker client to your registry.
```
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 510033969879.dkr.ecr.us-east-2.amazonaws.com
```
2. Build your Docker image
```
docker build -t tech/architecture/blog-app/posts .
```
3. Tag your image so you can push the image to this repository
```
docker tag tech/architecture/blog-app/posts:latest 510033969879.dkr.ecr.us-east-2.amazonaws.com/tech/architecture/blog-app/posts:latest
```
4. Push this image to your newly created AWS repository
```
docker push 510033969879.dkr.ecr.us-east-2.amazonaws.com/tech/architecture/blog-app/posts:latest
```

```
kubectl rollout restart deployment posts-dpl
```

#### How to install nginx-ingress
A load balancer takes the outside traffic to the cluster. The ingress controller respond to those requests by routing them to the pods inside the cluster. It does that based on some routing rules we defined which are defined based on the request's path. e.g [ingress-nginx](https://github.com/kubernetes/ingress-nginx/).

Installing ingress-nginx in minikube:
```
minikube addons enable ingress
```
Installing ingress-nginx in Docker for Mac:
```
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.46.0/deploy/static/provider/cloud/deploy.yaml
```
To check if the ingress controller pods have started, run the following command:
```
kubectl get pods -n ingress-nginx \
  -l app.kubernetes.io/name=ingress-nginx --watch
```
Once the ingress controller pods are running, you can cancel the command typing Ctrl+C.

Note: more info about the ingress service [here](https://kubernetes.io/docs/concepts/services-networking/ingress/)

#### Troubleshooting
```
minikube delete --all --purge
```