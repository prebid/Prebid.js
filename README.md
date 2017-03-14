Home of the Prebid.js documentation and downloads at [Prebid.org](http://prebid.org).

Thanks in advance for any contributions!  All contributors are listed in the **Thanks** section below.

Please see the sections below before submitting a PR.

+ [Contributing](#contributing)
+ [License](#license)
+ [Alphabetization of Bidder Adaptors](#alphabetization-of-bidder-adaptors)
+ [The Downloads Page](#the-downloads-page)
+ [Thanks](#thanks)

<a name="contributing" />

## Contributing

This is the repo that controls [Prebid.org](http://prebid.org).  We welcome any contributions.

For smaller changes, such as fixing a typo or adding a new section to an existing page, submit a pull request.

For larger changes such as reorganizing the site and moving/removing content, you may want to open an issue so we can discuss the work beforehand.  This is a good idea because:

+ We want to value your time, so you don't do unnecessary work
+ We want to value our users' time; we don't want to break links and bookmarks for users

<a name="license" />

## License

All docs are under the license shown in the `LICENSE` file in this directory.

<a name="alphabetization-of-bidder-adaptors" />

## Alphabetization of Bidder Adaptors

Please don't alphabetize the lists of adapters in your PR, either on the home page or the downloads page.

The adapters are not listed in alphabetical order, they're listed in the order in which they were added to the Prebid.js repo, using (approximately) this command:

```
$ for file in `git ls-files`; do HASH=`git rev-list HEAD $file | tail -n 1`; \  
  DATE=`git show -s --format="%ci" $HASH --`; printf "%-35s %s\n" $file "$DATE"; done
```

<a name="the-downloads-page" />

## The Downloads Page

Please don't submit PRs to the Prebid.org downloads page. That page gets updated as part of the Prebid.js release process and requires some updates to backend code that builds the library download for users.

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
