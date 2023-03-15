# Studentle

Forked From [**Reactle**](https://github.com/cwackerfuss/react-wordle)

This is a clone project of the popular word guessing game we all know and love. Made using 

, Typescript, and Tailwind.

[**Try it out!**](https://studentle.jackunderwood.org)

## Build and run

### To Run Locally:

Clone the repository and perform the following command line actions:

```bash
$> cd STUDENTLEV3
$> npm install
$> npm run start
```

### To build/run docker container:

#### Development

```bash
$> docker build -t STUDENTLEV3:dev -f docker/Dockerfile .
$> docker run -d -p 3000:3000 --name STUDENTLEV3-dev STUDENTLEV3:dev
```

Open [http://localhost:3000](http://localhost:3000) in browser.

#### Production

```bash
$> docker build --target=prod -t STUDENTLEV3:prod -f docker/Dockerfile .
$> docker run -d -p 80:8080  --name STUDENTLEV3-prod STUDENTLEV3:prod
```

Open [http://localhost](http://localhost) in browser.
