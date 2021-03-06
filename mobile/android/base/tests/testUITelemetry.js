// -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; js2-basic-offset: 2; js2-skip-preprocessor-directives: t; -*-
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

const TEST_PREFIX = "TEST-";
const TEST_REGEX = new RegExp("^" + TEST_PREFIX);

function do_check_array_eq(a1, a2) {
  do_check_eq(a1.length, a2.length);
  for (let i = 0; i < a1.length; ++i) {
    do_check_eq(a1[i], a2[i]);
  }
}

function getObserver() {
  let bridge = Cc["@mozilla.org/android/bridge;1"]
                 .getService(Ci.nsIAndroidBridge);
  let obsXPCOM = bridge.browserApp.getUITelemetryObserver();
  do_check_true(!!obsXPCOM);
  return obsXPCOM.wrappedJSObject;
}

/**
 * The following event test will fail if telemetry isn't enabled. The Java-side
 * part of this test should have turned it on; fail if it didn't work.
 */
add_test(function test_enabled() {
  let obs = getObserver();
  do_check_true(!!obs);
  do_check_true(obs.enabled);
  run_next_test();
});

add_test(function test_telemetry_events() {
  let obs = getObserver();
  let measurements = obs.getUIMeasurements().filter(function(m) {
    // Only want events and sessions that were generated by
    // the Java-side of the test.
    return TEST_REGEX.test(m.type == "event" ? m.action : m.name);
  });

  let expected = [
    ["event",   TEST_PREFIX + "enone",   "method0", [], null],
    ["event",   TEST_PREFIX + "efoo",    "method1", [TEST_PREFIX + "foo"], null],
    ["event",   TEST_PREFIX + "efoo",    "method2", [TEST_PREFIX + "foo"], null],
    ["event",   TEST_PREFIX + "efoobar", "method3", [TEST_PREFIX + "foo", TEST_PREFIX + "bar"], "foobarextras"],
    ["session", TEST_PREFIX + "foo",     "reasonfoo"],
    ["event",   TEST_PREFIX + "ebar",    "method4", [TEST_PREFIX + "bar"], "barextras"],
    ["session", TEST_PREFIX + "bar",     "reasonbar"],
    ["event",   TEST_PREFIX + "enone",   "method5", [], null],
  ];

  do_check_eq(expected.length, measurements.length);

  for (let i = 0; i < measurements.length; ++i) {
    let m = measurements[i];

    let type = m.type;
    if (type == "event") {
      let [type, action, method, sessions, extras] = expected[i];
      do_check_eq(m.action, action);
      do_check_eq(m.method, method);
      // might receive real sessions in addition to the test ones -- remove the real ones
      do_check_array_eq(m.sessions.filter(s => TEST_REGEX.test(s)), sessions);
      do_check_eq(m.extras, extras);
      continue;
    }

    if (type == "session") {
      let [type, name, reason] = expected[i];
      do_check_eq(m.name, name);
      do_check_eq(m.reason, reason);
      continue;
    }
  }

  run_next_test();
});

run_next_test();
