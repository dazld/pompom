# pompom

Fast, cpu-friendly webpack dev server, based on chokidar. Mainly a playground for using the webpack API and server side events. Feel free to play, try it out, fix things, whatever. In its current state, will probably blow up, but give it a go. It's kinda sorta working already™.

No iframes -.-

# installation

`npm install -g pompom`

# usage

Will look for the `webpack.config.js` file in the directory you invoke it in, and try to load your local webpack too.

Will blow up noisily if things are not quite right. Alpha alpha..

```
cd myproject
pompom --index=index.html // uses the specifed file for all accepts html requests if nothing specifically found

```

# features

- made thinking of single page apps, rewriting URL to single entry point etc
- will try its hardest not to crush your CPU via chokidar magic
- hopefully not too many crazy dependencies..

# done

- able to specify default index to serve SPA 'accepts html' routes 
- runs on specified hostname & port
- serves files with correct mime types
- bundles stuff when the project changes
- tells browser to reload when build has changed via a server side event. fun!

# todo

- cleanup closed connections (yeah, yeah..)
- cover more cases than single entry point, single build output
- allow for when we can't find local webpack or webpack config
- allow command line overrides
- support more bundlers than webpack
- tests :S

