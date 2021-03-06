/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

var cordova_util = require('./util'),
    HooksRunner  = require('../hooks/HooksRunner'),
    Q            = require('q'),
    platform_lib = require('../platforms/platforms'),
    _ = require('underscore');


// Returns a promise.
module.exports = function emulate(options) {
    return Q().then(function() {
        var projectRoot = cordova_util.cdProjectRoot();
        options = cordova_util.preProcessOptions(options);
        options.options.device = false;
        options.options.emulator = true;

        var optsClone = _.clone(options.options);
        // This is needed as .build modifies opts
        optsClone.nobuild = true;

        var hooksRunner = new HooksRunner(projectRoot);
        return hooksRunner.fire('before_emulate', options)
        .then(function() {
            if (!options.options.noprepare) {
                // Run a prepare first!
                return require('./cordova').prepare(options);
            }
        }).then(function() {
            // Deploy in parallel (output gets intermixed though...)
            return Q.all(options.platforms.map(function(platform) {

                var buildPromise = options.options.nobuild ? Q() :
                    platform_lib.getPlatformApi(platform).build(options.options);

                return buildPromise
                .then(function() {
                    return hooksRunner.fire('before_deploy', options);
                })
                .then(function() {
                    return platform_lib.getPlatformApi(platform).run(optsClone);
                });
            }));
        }).then(function() {
            return hooksRunner.fire('after_emulate', options);
        });
    });
};
