import { createModule, bootstrap } from 'src/modules';

export function getModule(setCb) {
    var tmp = window.$$PREBID_GLOBAL$$;
    var testModule = {};

    window.$$PREBID_GLOBAL$$ = {
        module: function() {
            testModule = createModule.apply(null, arguments);
        }
    };

    setCb();

    window.$$PREBID_GLOBAL$$ = tmp;

    return bootstrap.bind(null, testModule);
}
