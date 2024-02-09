
## Preparing your development workstation

To setup your workstation to start developing a website with Phoenix, the following is a set of dependencies we'll need to install first.  

There are quite a few tools used in daily web development these days.  A pre-requisite for following these instructions will be knowing your way around a linux/unix terminal shell, that includes knowing how to install packages or even package installers for your specific shell (e.g, bash or zsh).

### A note for Windows Users

If you're on Windows, I highly recommend you install the windows subsystem for linux, before you start.  

https://learn.microsoft.com/en-us/windows/wsl/install

That will give you a similar environment as production and make other activities a lot easier such as dockerizing, setting paths or environment variables.

If you're on Linux you're already good to go.  If you're on Mac you're fine too.  

### Install Chrome Browser

The Chrome browser has the best compatability specs for WebGL, (FireFox is also great).  I primarily tested on Chrome and the Oculus Quest headset comes with a browser that is also based on Chromium.

### Install WebXR Device Emulator Browser Extension

Go to the chrome web store and search for webxr.  At the time of this writing there are two extensions to choose from that will emulate an WebXR compatible device.  This is useful for testing some aspects of a VR scene using your desktop browser without needing to put on a headset.

### Install Elixir

To develop a code project using Phoenix (a web framework) we're first going to need Elixir (the language and runtime that Phoenix is written in).  You can follow the Elixir online docs for how to install Elixir for your operating system.

https://elixir-lang.org/install.html

The link above provides instructions for installing Elixir on various operating systems, so I won't bother repeating the instructions here.  Find the appropriate guide for your system (if using WSL, use the linux guide).  

#### ASDF a version manager for Elixir/Erlang

Alternatively, for slightly more experienced developers you can install Elixir and Erlang using a utility called `asdf` so that you can switch versions or install multiple Elixir versions on your system.  

Read the asdf instructions for installing Erlang and Elixir, they'll have the latest instructions for your system.  When I tried to install the latest Erlang I had an error regarding wxWidgets and had to do some Googling: https://github.com/asdf-vm/asdf-erlang/issues/203 and had to install some other linux dependencies first.

#### Verifying Elixir Installation

Whatever method of installation you choose, if all goes well, you should be able to open up a terminal and check which version of elixir you have installed like this:

```bash
erl -s erlang halt
Erlang/OTP 26 [erts-14.2] [source] [64-bit] [smp:32:32] [ds:32:32:10] [async-threads:1] [jit:ns]

elixir -v
Erlang/OTP 26 [erts-14.2] [source] [64-bit] [smp:32:32] [ds:32:32:10] [async-threads:1] [jit:ns]

Elixir 1.15.7 (compiled with Erlang/OTP 26)
```

### Preserve iex history.

Elixir comes with a REPL (read-eval-print-loop), `iex`.  It's very useful for testing out elixir commands.

We're going to be working in the iex terminal from time to time, and surprisingly the up arrow does not bring back the previous command history between iex sessions.  I find that so annoying that that is not the default.  Luckily we can add this to our shell profile startup script and that will fix that annoyance.

```bash
# Add to shell profile
export ERL_AFLAGS="-kernel shell_history enabled"
```

### Install docker and docker-compose.  

You can skip this step if you already have Postgres on your machine.  But even if you do I recommend installing Docker anyway.  There are two reasons for wanting to use docker.  The first reason is so that we can run a local database with ease as we develop without worrying about version collisions or configuration conflicts with our host machine.  

For Windows and Mac users the easiest way is probably by installing Docker Desktop for Windows (and mac) respectively.  The second reason for using docker is for when it comes time for deployment to production, creating a docker image might be one of the ways we'll want to utilize for deployment, so familiarity with docker is helpful.  

Please lookup the instructions for installing docker and docker-compose on your system.  I'm using Windows and Windows Sub-System for Linux (WSL).  When I install Docker Desktop for Windows it automatically comes with docker-compose and docker is automatically available to me in the WSL command line environment as well.

We will be using Docker to run our local database.  Remember to have the docker server running, otherwise the server can't find the database.


### Install vscode.

This is my recommended code editor.  You can install a different one if you prefer.

Install Elixir plugins for vscode

These help with syntax highlighting and code completion.  I recommend Googling for the latest recommended extensions and installing those.  

At the time of this writing I'm using:
- jakebecker.elixir-ls
- phoenixframework.phoenix
- bradlc.vscode-tailwindcss

This is my vscode settings.json

```json
{
  "window.commandCenter": false,
  "files.associations": {
    "*.heex": "phoenix-heex",
  },
  "[elixir]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "JakeBecker.elixir-ls"
  },
  "[phoenix-heex]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "JakeBecker.elixir-ls"
  },
  "emmet.includeLanguages": {
    "phoenix-heex": "html",
    "elixir": "html",
  },
  "tailwindCSS.includeLanguages": {
    "phoenix-heex": "html",
    "elixir": "html",
  },
  "codeium.enableConfig": {
    "*": true,
    "phoenix-heex": true
  },
  "git.confirmSync": false,
  "editor.formatOnSave": true,
  "editor.indentSize": "tabSize",
  "editor.tabSize": 2,
  "javascript.format.semicolons": "insert",
  "typescript.format.semicolons": "insert",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "remote.autoForwardPortsSource": "hybrid",
  "editor.codeActionsOnSave": {},
}
```

### Install Phoenix

https://hexdocs.pm/phoenix/installation.html

```bash
mix local.hex
mix archive.install hex phx_new
```
I'm using Phoenix 1.7.10.  You should use the same versions as I am using if you want to follow along.  That way, the code generator commands that I provide in the following chapters will produce the same code output that they do for me as I write this book.

### Install Node and NPM

Phoenix comes with esbuild which is capable of bundling javascript without Node or NPM.  However, in a later chapter I find it necessary to customize our esbuild script, so we'll eventually need to install npm packages.  

You can skip ahead if you already have node on your machine, however I encourage you to keep to the same version I'm using in this repository.

I'll be installing node through `nvm` (useful for when you're working on multiple projects with different versions of node):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```

Add this to your shell script.

```bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Now install the latest node:

```bash
nvm install node
```

Fyi, if you create a .nvmrc file any of your future project directorys and populate it like so:

```bash
echo "v21.5.0" > .nvmrc
```

That allows the ability to run this command in the project folder:

```bash
nvm use
Found '/home/titan/web_projects/xr/.nvmrc' with version <v21.5.0>
Now using node v21.5.0 (npm v10.2.4)
```

That becomes useful for switching node version from within different projects.

### Summary

At this point your machine will hopefully have Chrome, Elixir, Phoenix, Node, Npm, Docker and VsCode successfully installed and we're ready to create our project.