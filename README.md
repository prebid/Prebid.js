This repository contains the source files for the Prebid.js documentation site at [Prebid.org](http://prebid.org).

Please see the sections below for more information.

+ [Contributing](#contributing)
+ [License](#license)
+ [Prerequisites](#prerequisites)
+ [Running Jekyll Locally](#running-jekyll-locally)
+ [Alphabetization of Bidder Adapters](#alphabetization-of-bidder-adaptors)
+ [The Downloads Page](#the-downloads-page)
+ [Thanks](#thanks)

<a name="contributing" />

## Contributing

Thanks in advance for your contribution!  Contributors are listed in the **Thanks** section below.

For smaller changes, such as fixing a typo or adding a new section to an existing page, submit a pull request.

For larger changes such as reorganizing the site and moving/removing content, you may want to open an issue so we can discuss the work beforehand.  This is a good idea because:

+ We want to value your time, so you don't do unnecessary work
+ We want to value our users' time; we don't want to break links and bookmarks for users

<a name="license" />

## License

All docs are under the license shown in the `LICENSE` file in this directory.

<a name="prerequisites" />

## Prerequisites

The site uses [Jekyll](http://jekyllrb.com/), which is written in the [Ruby](http://www.ruby-lang.org/en/) language.

To follow the instructions in the next section, you will need to install the [Bundler](http://bundler.io/) Ruby gem.

Try the following command:

```
$ gem install bundler
```

If you are on a Mac and the above command fails with a permissions error (e.g., `"ERROR:  While executing gem ... You don't have write permissions for the /Library/Ruby/Gems/... directory."`), try the following steps:

1. Build your own `ruby` binary using [Homebrew](https://brew.sh/): `brew install ruby`.  The Homebrew-built Ruby should include its own version of the `gem` command which avoids modifying system libraries.
2. Try `gem install bundler` again.  If it still fails, try `sudo gem install bundler`.  After that, you should be able to avoid any further use of `sudo` by running `bundler` with the arguments shown in the next section.

<a name="running-jekyll-locally" />

## Running Jekyll Locally

Before submitting a pull request, you should run the site locally to make sure your edits actually work.

To get started editing the site and seeing your changes, clone this repo and enter the following commands in your terminal:

- `cd /path/to/prebid.github.io`

- `bundle install --path vendor/bundle`

- `bundle exec jekyll serve`

You should see output that looks something like this:

```
Configuration file: /Users/rloveland/Dropbox/Code/prebid.github.io/_config.yml  
            Source: /Users/rloveland/Dropbox/Code/prebid.github.io  
       Destination: /Users/rloveland/Dropbox/Code/prebid.github.io/_site  
 Incremental build: disabled. Enable with --incremental  
      Generating...   
                    done in 13.596 seconds.  
 Auto-regeneration: enabled for '/Users/rloveland/Dropbox/Code/prebid.github.io'  
Configuration file: /Users/rloveland/Dropbox/Code/prebid.github.io/_config.yml  
    Server address: http://127.0.0.1:8080/  
  Server running... press ctrl-c to stop.  
...  
...  
```

Open the `Server address` URL in your browser, and you should see a locally running copy of the site.

<a name="alphabetization-of-bidder-adaptors" />

## Alphabetization of Bidder Adaptors

Please don't alphabetize the lists of adapters in your PR, either on the home page or the downloads page.

The adapters are not listed in alphabetical order, they're listed in the order in which they were added to the Prebid.js repo, using (approximately) this command in `src/adapters`:

```
for file in `ls | grep -f <(git ls-files)`; do
    HASH=`git rev-list HEAD $file | tail -n 1`;
    DATE=`git show -s --format="%ci" $HASH --`;
    printf "%-35s %-35s %s\n" $file "$DATE" $HASH;
done | sort -d -k 2
```

<a name="the-downloads-page" />

## The Downloads Page

Please don't submit PRs to the Prebid.org downloads page. That page gets updated in tandem with the Prebid.js release process.

The Downloads page is generated from [the Markdown bidder adapter docs](https://github.com/prebid/prebid.github.io/tree/master/dev-docs/bidders), so the process for updating is:

1. Your adapter code is merged into Prebid.js
2. Your bidder docs PR is submitted over here to the docs site
3. Your adapter code is included with a release
4. Once your adapter code is actually released, we merge the adapter docs PR, and the Downloads page is automagically updated with a checkbox to include your adapter.

This means an adaptor is not available to download from Prebid.org as soon as the code gets merged into Prebid.js - it will be available after the next release (usually in a couple of weeks).

<a name="thanks" />

## Thanks

Many thanks to the following people who have submitted content to Prebid.org.  We really appreciate the help!

In alphabetical order:

+ Alejandro Villanueva <admin@ialex.org>
+ Andrew Bowman <gbowman@appnexus.com>
+ Andy Stocker <astocker@blinkx.com>
+ Artem Dmitriev <art.dm.ser@gmail.com>
+ Bart van Bragt <github.com@vanbragt.com>
+ Bret Gorsline <bgorsline@rubiconproject.com>
+ Carson Banov <carson@spanishdict.com>
+ Chris Hepner <me@chrishepner.info>
+ Christopher Allene <christopher.allene@piximedia.fr>
+ Dan Harton <dan@sparklit.com>
+ David <david@singernet.com>
+ David M <david.mejorado@gmail.com>
+ Ilya Pirogov <ilja.pirogov@gmail.com>
+ Itay Ovits <itay@komoona.com>
+ Jackson Faddis <github@betab.it>
+ Jonny Greenspan <greens@cooper.edu>
+ Joseph Frazer <frazjp65@users.noreply.github.com>
+ Julien Delhommeau <jdelhommeau@appnexus.com>
+ Kir Apukhtin <kirill@roxot.com>
+ Kizzard <kiz@kizzard.net>
+ Lin Rubo <rubo.lin@qq.com>
+ Matan Arbel <matana@ybrantdigital.com>
+ Mats Attnas <mats.attnas@twenga.com>
+ Matt Jacobson <mjacobson@appnexus.com>
+ Matt Jacobson <mjacobsonny@gmail.com>
+ Matt Kendall <emailmatthere@gmail.com>
+ Matt Kendall <mkendall@appnexus.com>
+ Matt Lane <mlane@appnexus.com>
+ Mordhak <adrien.desmoules@gmail.com>
+ Nate Guisinger <ncozi@appnexus.com>
+ Niksok <belnamtar@mail.ru>
+ Paul <heranyang@gmail.com>
+ Paul Yang <heranyang@gmail.com>
+ Paul Young <heranyang+prebid@gmail.com>
+ Pavlos Kalogiannidis <pkalogiannidis@wideorbit.com>
+ Prebid-Team <prebid-team@vertoz.com>
+ Raffael Vogler <raffael.vogler.de@gmail.com>
+ Rich Loveland <loveland.richard@gmail.com>
+ Rich Loveland <rloveland@appnexus.com>
+ Ronald Berner <ronald@sonobi.com>
+ Sahagun, Manny <msahagun@conversantmedia.com>
+ Tiffany Wu <twu@triplelift.com>
+ Vladimir Marteev <xor104@gmail.com>
+ astudnicky <astudnicky@sonobi.com>
+ bjorn-wo <bandersson@wideorbit.com>
+ bjorna <bandersson@wideorbit.com>
+ christopher-allene-piximedia <christopher.allene@piximedia.fr>
+ devmusings <devmusings@users.noreply.github.com>
+ dlogachev <denis@adkernel.com>
+ eyal <eyal@sekindo.com>
+ lntho <leon.tzuhao.ho@gmail.com>
+ lukian <luciano.ferraro@gmail.com>
+ naegelin <chris@spotflux.com>
+ ncozi <ncozi@appnexus.com>
+ onaydenov <onaydenov@users.noreply.github.com>
+ prebid <heranyang+prebid@gmail.com>
+ prebid <prebid@users.noreply.github.com>
+ protonate <ncozi@appnexus.com>
+ rizhang <rizhang@umich.edu>
+ rml <rloveland@appnexus.com>
+ ronenst <stern.ronen@gmail.com>
+ sberry <sberry@appnexus.com>
+ studnicky <astudnicky@sonobi.com>
