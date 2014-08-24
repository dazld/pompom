# pompom

WIP Low cpu, fast webpack dev server, based on chokidar.

# installation

`npm install -g pompom`

# usage

```

cd myproject
pompom --index=index.html // uses the specifed file for all accepts html requests if nothing specifically found


```

# features

- will be tailored for single page apps, rewriting URL to single entry point etc
- will try its hardest not to crush your CPU via chokidar magic
- hopefully not too many crazy dependencies..

# done

- able to specify default index to serve SPA 'accepts html' routes 
- runs on specified hostname & port
- serves files with correct mime types

# todo

- actually bundle something
- support more bundlers than webpack
- tests :S

