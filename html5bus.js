(function () {

    window.addEventListener('message', function (event) {
        var source = event.source;
        var origin = event.origin;
        var message = event.data;
        console.log(message);
        var action = message.action;
        var body = message.body;

        var actionFunction = actionFunctionMap[action];

        if (actionFunction) {
            actionFunction(source, origin, body);
        }

    });

    var PollingTimers = {};

    var Windows = {};
    var ConnectedWindows = [];

    var actionFunctionMap = {
        "handshake1": function (source, origin, body) {
            source.postMessage({
                action: "handshake1-response",
                body: {
                    success: true
                }
            }, origin);
            Windows[source] = {
                origin: origin,
                first: {
                    initiated: true,
                    completed: true
                },
                second: {
                    initiated: false,
                    completed: false
                },
                connected: false,
                isChild: false
            };
        },
        "handshake1-response": function (source, origin, body) {
            var timer = PollingTimers[source];
            var handshake = Windows[source];
            if (timer && handshake.first.initiated) {
                var success = body.success;
                clearInterval(timer.pollster);
                if (!success) {
                    timer.callback.call(window, {
                        success: false
                    });
                    delete PollingTimers[source];
                } else {
                    handshake.first.completed = true;
                }
            }
        },
        "handshake2": function (source, origin, body) {
            var wnd = Windows[source];
            if (wnd && wnd.first.completed) {
                wnd.second.initiated = true;
                wnd.second.completed = true;
                wnd.connected = true;

                source.postMessage({
                    action: "handshake2-response",
                    body: {
                        success: true
                    }
                }, origin);

                ConnectedWindows.push(source);

                var timer = PollingTimers[source];
                if (timer) {
                    clearInterval(timer);
                    timer.callback.call(window, {
                        success: true
                    });
                }
            } else {
                // TODO
            }
        },
        "handshake2-response": function (source, origin, body) {
            var callback = ParentCallbacks[origin];
            if (callback) {
                var wnd = Windows[source];
                if (wnd) {
                    if (wnd.first.completed && wnd.second.initiated) {
                        wnd.second.completed = true;
                        wnd.connected = true;
                        callback.call(window, {
                            success: true
                        });
                        delete ParentCallbacks[origin];
                    } else {
                        // TODO
                    }
                } else {
                    // TODO
                }
            }
        },
        "process-message": processMessage
    };

    var pollInterval = 100;

    var ParentCallbacks = {};

    var MessageCallbackMap = {};

    window.Html5Bus = {
        connectToChild: function (child, origin, callback, timeout) {
            if (!PollingTimers[child]) {

                var pollingTime = 0;
                timeout = timeout || 5;

                PollingTimers[child] = {
                    pollster: function () {
                        child.postMessage({
                            action: "handshake1"
                        }, origin);
                        pollingTime += pollInterval;
                        if (pollingTime > timeout) {
                            clearInterval(PollingTimers[child].pollster);
                        }
                    },
                    callback: callback
                };

                setTimeout(PollingTimers[child].pollster, 100);

                Windows[source] = {
                    origin: origin,
                    first: {
                        initiated: true,
                        completed: false
                    },
                    second: {
                        initiated: false,
                        completed: false
                    },
                    connected: false,
                    isChild: true
                };
            }
        },
        connectToParent: function (origin, callback) {
            var parent = window.parent || window.opener;

            if (parent) {
                var handshake = Windows[parent];
                if (handshake) {
                    if (handshake.first.completed) {
                        handshake.second.initiated = true;
                        parent.postMessage({
                            action: "handshake2"
                        }, origin);
                        ParentCallbacks[origin] = callback;
                    } else {
                        // TODO place on queue
                    }
                } else {
                    // TODO
                }
            } else {
                setTimeout(function () {
                    callback.call(window, {
                        success: false,
                        reason: "No parent exists."
                    });
                }, 0);
            }
        },
        publish: function (topic, message) {
            var windows = Object.keys(Windows);

            windows.forEach(function (wnd) {
                if (windows[wnd].connected) {
                    wnd.postMessage({
                        action: "process-message",
                        body: {
                            topic: topic,
                            message: message
                        }
                    }, wnd.origin);
                }
            });
        },
        subscribe: function (child, topic, callback) {
            var mcb = MessageCallbackMap;
            mcb[child] = mcb[child] || {};
            mcb[child][topic] = mcb[child][topic] || [];
            mcb[child][topic].push(callback);
        },
        unsubscribe: function (child, topic, callback) {
            var mcb = MessageCallbackMap;
            if (mcb) {
                if (mcb[child]) {
                    if (mcb[child][topic]) {
                        mcb[child][topic].splice(mcb[child][topic].indexOf(callback),1);
                    }
                }
            }
        },
        send: function (child, topic, message) {
            var wnd = Windows[child];
            if (wnd && wnd.connected) {
                child.postMessage({
                    action: "process-message",
                    body: {
                        topic: topic,
                        message: message
                    }
                }, wnd.origin);
            } else {
                // TODO
            }
        }
    };



    function processMessage(source, origin, body) {

        // TODO forward message to siblings
    }
})();