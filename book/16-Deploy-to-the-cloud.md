## Deploy to a cloud server

Up until now we've been using our local machine to do development and testing.  When we put on the headset we've been using ngrok to create an SSH tunnel from an ngrok https endpoint to the server running on our local machine.

Even though the project is still in the development stage, it would be nice to be able to deploy the code to a platform service that is not on our local machine.  They way we provide a public demo site where we can invite more beta testers to try our game features as we add them, without having folks connect to our local machine.

## Choose a Platform

There are many destinations we could deploy our code to, some platforms more complicated than others.  At this time I recommend [Gigalixir](https://www.gigalixir.com/).  It is more or less a turn-key solution for hosting Elixir/Phoenix apps without having to worry about how to do some of the more advanced things such as node-balancing or clustering.  They are built on top of either Google Cloud Platform (GCP) or Amazon Web Services (AWS) and we get to choose.

They also have a free tier with a dummy database so we can try before we buy.  

## Create an Account

First sign-up for an account at https://www.gigalixir.com/

## Install the Gigalixir CLI

https://www.gigalixir.com/docs/cli

```bash
pip3 install -U gigalixir --user
```

## Login using the CLI

```bash
gigalixir login
```

After that you'll be able to create applications and run commands to control your account from the command line.

## Add Buildpacks

Buildpacks specify what versions of software we need in their servers (containers?) in the cloud.

These are my versions

```bash
echo "elixir_version=1.15.7" > elixir_buildpack.config
echo "erlang_version=26.2" >> elixir_buildpack.config
echo "node_version=21.5.0" > phoenix_static_buildpack.config
```

Gigalixer works with git so you'll need to commit the buildpack files.

```bash
git add elixir_buildpack.config phoenix_static_buildpack.config
git commit -m "set elixir, erlang, and node version"
```

### Add deploy script

Add this line into our existing assets/package.json to tell the buildpacks how to compile the assets:

```bash
  "scripts": {
    "deploy": "cd .. && mix assets.deploy && rm -f _build/esbuild"
  }
```

### Create gigalixir app

Now create a gigalixir app, you can also pass a name using the -n flag.  You can also use the --cloud and --region to choose the cloud provider and region.  I'll create mine in the aws cloud in the us-west-2 region.

```bash
gigalixir create -n $APP_NAME --cloud aws --region us-west-2
```

For now I'll create a free tier database:

```bash
gigalixir pg:create --free
```

# Deploy

Push code to gigalixir via git to deploy:

```bash
git push -u gigalixir main
```