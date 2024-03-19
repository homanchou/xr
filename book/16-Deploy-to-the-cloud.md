## Deploy to a cloud server

Up until now we've been using our local machine to do development and testing.  When we put on the headset we've been using ngrok to create an SSH tunnel from an ngrok https endpoint to the server running on our local machine.

Even though the project is still in the development stage, it would be nice to be able to deploy the code to a platform service that is not on our local machine.  They way we provide a public demo site where we can invite more beta testers to try our game features as we add them, without having folks connect to our local machine.

## Choose a Platform

There are many destinations we could deploy our code to, some platforms more complicated than others.  At this time I recommend [Gigalixir](https://www.gigalixir.com/).  It is more or less a turn-key solution for hosting Elixir/Phoenix apps without having to worry about how to do some of the more advanced things such as node-balancing or clustering.  They are built on top of either Google Cloud Platform (GCP) or Amazon Web Services (AWS) and we get to choose.

They also have a free tier with a dummy database so we can try before we buy.  

## Create an Account

First sign-up for an account at https://www.gigalixir.com/

## Add Buildpacks

Buildpacks specify what versions of software we need in their servers (containers?) in the cloud.

These are my versions

```bash
echo "elixir_version=1.15.7" > elixir_buildpack.config
echo "erlang_version=26.2" >> elixir_buildpack.config
echo "node_version=21.5.0" > phoenix_static_buildpack.config

git add elixir_buildpack.config phoenix_static_buildpack.config
git commit -m "set elixir, erlang, and node version"
```