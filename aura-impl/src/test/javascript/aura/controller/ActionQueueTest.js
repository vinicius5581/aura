/*
 * Copyright (C) 2013 salesforce.com, inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

Function.RegisterNamespace("Test.Aura.Controller");

[ Fixture ]
Test.Aura.Controller.ActionQueueTest = function() {
    // Mock the exp() function defined in Aura.js, this is originally used for exposing members using a export.js file
    Mocks.GetMocks(Object.Global(), {
        "exp": function() {},
        "$A": {ns:{}},
        "Aura": {Controller: {}}
    })(function() {
	// Action objects are used for tests here
	// #import aura.controller.Action
	
	//This file is testing the implementation for ActionQueue, so import that
    // #import aura.controller.ActionQueue
	
    });

    var mockGlobal = Mocks.GetMocks(Object.Global(), {
        "$A" : {
            util : {
                isUndefinedOrNull: function (obj) {
                    return obj === undefined || obj === null;
                },
                json : {
                    encode : function(val) {
                        return val;
                    },
                    orderedEncode: function(obj) {
                        return obj;
                    }
                }
            },
            log : function() {
            }

        }
    });

    var serverDef = {
        isServerAction : function() {
            return true;
        },
        isClientAction : function() {
            return false;
        },
        isCaboose : function() {
            return false;
        },
        getDescriptor : function() {
            return "serverDef";
        }
    };

    var serverCabooseDef = {
        isServerAction : function() {
            return true;
        },
        isClientAction : function() {
            return false;
        },
        isCaboose : function() {
            return true;
        },
        getDescriptor : function() {
            return "serverCabooseDef";
        }
    };

    var clientDef = {
        isServerAction : function() {
            return false;
        },
        isClientAction : function() {
            return true;
        },
        isCaboose : function() {
            return false;
        },
        getDescriptor : function() {
            return "clientDef";
        }
    };

    [ Fixture ]
    function Constructor() {
        [ Fact ]
        function SetsTransactionIdAndLastAbortableTransactionId() {
            // Arrange

            // Act
            var target = new ActionQueue();
            var expected = target.nextTransactionId;
            var actual = target.lastAbortableTransactionId;

            // Assert
            Assert.Equal(expected, actual);
        }

        [ Fact ]
        function ActionsIsEmptyAfterInit() {
            // Arrange
            var expected = 0;
            var target = new ActionQueue();

            // Act
            var actual = target.actions.length;

            // Assert
            Assert.Equal(expected, actual);
        }
    }

    [ Fixture ]
    function Enqueue() {
        [ Fact ]
        function EnqueuesAction() {
            // Arrange
            var expected = new Action(serverDef);
            var target = new ActionQueue();

            // Act
            mockGlobal(function() {
                target.enqueue(expected);
            });
            var actual = target.actions;

            // Assert
            Assert.Equal([ expected ], actual);
        }

        [ Fact ]
        function SetsXHR() {
            // Arrange
            var target = new ActionQueue();
            var serverAction = new Action(serverDef);

            // Act
            mockGlobal(function() {
                target.enqueue(serverAction);
            });
            var actual = target.xhr;

            // Assert
            Assert.Equal(true, actual);
        }
        [ Fact ]
        function DoesntSetXHROnCaboose() {
            // Arrange
            var target = new ActionQueue();
            var serverCabooseAction = new Action(serverCabooseDef);
            serverCabooseAction.caboose = true;

            // Act
            mockGlobal(function() {
                target.enqueue(serverCabooseAction);
            });
            var actual = target.xhr;

            // Assert
            Assert.Equal(false, actual);
        }
        [ Fact ]
        function LeavesXHROnCaboose() {
            // Arrange
            var target = new ActionQueue();
            var serverAction = new Action(serverDef);
            var serverCabooseAction = new Action(serverCabooseDef);

            // Act
            mockGlobal(function() {
                target.enqueue(serverAction);
                target.enqueue(serverCabooseAction);
            });
            var actual = target.xhr;

            // Assert
            Assert.Equal(true, actual);
        }

        [ Fact ]
        function EnqueuesAbortableAction() {
            // Arrange
            var expected = new Action(serverDef);
            var target = new ActionQueue();
            var abortable, actual;
            // Act
            mockGlobal(function() {
                expected.setAbortable(true);
                target.enqueue(expected);
                target.enqueue(expected);
                actual = target.actions;
                abortable = actual[0].isAbortable();
            });

            // Assert
            Assert.Equal([ expected, expected ], actual);
            Assert.True(abortable);
        }

        [ Fact ]
        function CallsClearPreviousAbortableActionsWhenAbortableActionIsEnqueuedOnNewTransaction() {
            var expected = [ "lastTransaction" ];
            var abortable = new Action(serverDef);
            var target = new ActionQueue();
            target.incrementNextTransactionId();
            target.clearPreviousAbortableActions = Stubs.GetMethod("queue", []);
            target.actions = expected;

            mockGlobal(function() {
                abortable.setAbortable(true);
                target.enqueue(abortable);
            });

            Assert.Equal([ {
                Arguments : {
                    queue : expected
                },
                // abortable not returned but pushed onto returned list
                ReturnValue : [ abortable ]
            } ], target.clearPreviousAbortableActions.Calls);
        }

        [ Fact ]
        function DoesNotCallClearPreviousAbortableActionsWhenAbortableActionWithIdSetEnqueuedOnNewTransaction() {
            var expected = [ "lastTransaction" ];
            var abortable = new Action(serverDef);
            var target = new ActionQueue();
            target.currentTransactionId = target.nextTransactionId;
            target.incrementNextTransactionId();
            target.clearPreviousAbortableActions = Stubs.GetMethod("queue", []);
            target.actions = expected;

            mockGlobal(function() {
                abortable.setAbortable(true);
                target.enqueue(abortable);
            });

            Assert.Equal(0, target.clearPreviousAbortableActions.Calls.length);
        }

        [ Fact ]
        function DoesNotCallClearPreviousAbortableActionsWhenAbortableActionIsEnqueuedOnCurrentTransaction() {
            var abortable = new Action(serverDef);
            var target = new ActionQueue();
            target.clearPreviousAbortableActions = Stubs.GetMethod();

            mockGlobal(function() {
                abortable.setAbortable(true);
                target.enqueue(abortable);
            });

            Assert.Equal(0, target.clearPreviousAbortableActions.Calls.length);
        }

        [ Fact ]
        function DoesNotCallClearPreviousAbortableActionsWhenNonAbortableActionIsEnqueuedOnNewTransaction() {
            var action = new Action(serverDef);
            var target = new ActionQueue();
            target.incrementNextTransactionId();
            target.clearPreviousAbortableActions = Stubs.GetMethod();

            mockGlobal(function() {
                target.enqueue(action);
            });

            Assert.Equal(0, target.clearPreviousAbortableActions.Calls.length);
        }

        [ Fact ]
        function DoesNotCallClearPreviousAbortableActionsWhenParentedAbortableActionIsEnqueued() {
            var action = new Action(serverDef);
            var target = new ActionQueue();
            target.incrementNextTransactionId();
            target.clearPreviousAbortableActions = Stubs.GetMethod();
            action.setAbortableId(target.getLastAbortableTransactionId());

            mockGlobal(function() {
                target.enqueue(action);
            });

            Assert.Equal(0, target.clearPreviousAbortableActions.Calls.length);
        }

        [ Fact ]
        function AbortsActionIfParentAborted() {
            var action = new Action(serverDef);
            var target = new ActionQueue();
            var actual = false;

            mockGlobal(function() {
                action.abort = function() {
                    actual = true;
                }
                action.setAbortable();
                action.setAbortableId("ALREADYABORTED");
                target.enqueue(action);
            });

            Assert.Equal(true, actual);
        }
    }

    [ Fixture ]
    function ClearPreviousAbortableActions() {
        [ Fact ]
        function PrunesOldAbortableAction() {
            var old = new Action(serverDef);
            var expected = new Action(serverDef);
            var target = new ActionQueue();
            target.actions = [ old ];
            target.incrementNextTransactionId();

            mockGlobal(function() {
                old.setAbortable(true);
                expected.setAbortable(true);
                target.enqueue(expected);
            });

            var actual = target.actions;

            Assert.Equal([ expected ], actual);
        }

        [ Fact ]
        function PrunesOldAbortableActionsFromSet() {

            var oldest = new Action(serverDef);
            var nonAbortable1 = new Action(serverDef);
            var older = new Action(serverDef);
            var nonAbortable2 = new Action(serverDef);
            var old = new Action(serverDef);
            var expected = new Action(serverDef);

            var target = new ActionQueue();
            target.actions = [ oldest, nonAbortable1, older, nonAbortable2, old ];
            target.incrementNextTransactionId();

            mockGlobal(function() {
                oldest.setAbortable(true);
                older.setAbortable(true);
                old.setAbortable(true);
                expected.setAbortable(true);
                target.enqueue(expected);
            });

            var actual = target.actions;

            Assert.Equal([ nonAbortable1, nonAbortable2, expected ], actual);
        }

        [ Fact ]
        function CallsAbortOnPrunedActions() {
            var older = new Action(serverDef);
            older.abort = Stubs.GetMethod();
            var nonAbortable = new Action(serverDef);
            nonAbortable.abort = Stubs.GetMethod();
            var old = new Action(serverDef);
            old.abort = Stubs.GetMethod();
            var expected = new Action(serverDef);
            expected.abort = Stubs.GetMethod();
            var target = new ActionQueue();
            target.actions = [ older, nonAbortable, old ];
            target.incrementNextTransactionId();

            mockGlobal(function() {
                older.setAbortable(true);
                old.setAbortable(true);
                expected.setAbortable(true);
                target.enqueue(expected);
            });

            Assert.Equal(1, older.abort.Calls.length);
            Assert.Equal(1, old.abort.Calls.length);
            Assert.Equal(0, expected.abort.Calls.length);
            Assert.Equal(0, nonAbortable.abort.Calls.length);
        }
    }

    [ Fixture ]
    function GetClientActions() {
        [ Fact ]
        function ReturnsEmptyListIfQueueEmpty() {
            var target = new ActionQueue();

            var actual = target.getClientActions();

            Assert.Equal([], actual);
        }

        [ Fact ]
        function ReturnsEmptyListIfNoClientActions() {
            var background = new Action(serverDef, null, null, null, true);
            var server = new Action(serverDef);
            var target = new ActionQueue();
            target.actions = [ background, server ];

            var actual = target.getClientActions();

            Assert.Equal([], actual);
            Assert.Equal([ background, server ], target.actions);
        }

        [ Fact ]
        function ReturnsClientAction() {
            var expected = new Action(clientDef);
            var target = new ActionQueue();
            target.actions = [ expected ];

            var actual = target.getClientActions();

            Assert.Equal([ expected ], actual);
            Assert.Equal([], target.actions);
        }

        [ Fact ]
        function ReturnsClientActionsFromSet() {
            var first = new Action(clientDef);
            var background = new Action(serverDef, null, null, null, true);
            var second = new Action(clientDef, null, null, null, true);
            var server = new Action(serverDef);
            var third = new Action(clientDef);
            var target = new ActionQueue();
            target.actions = [ first, background, second, server, third ];

            var actual = target.getClientActions();

            Assert.Equal([ first, second, third ], actual);
            Assert.Equal([ background, server ], target.actions);
        }
    }

    [ Fixture ]
    function GetServerActions() {
        [ Fact ]
        function ResetsXHR() {
            var target = new ActionQueue();

            target.xhr = true;
            target.getServerActions();
            var actual = target.xhr;

            Assert.Equal(false, actual);
        }
        [ Fact ]
        function ReturnsEmptyListIfQueueEmpty() {
            var target = new ActionQueue();

            var actual = target.getServerActions();

            Assert.Equal([], actual);
        }

        [ Fact ]
        function ReturnsEmptyListIfNoServerActions() {
            var background = new Action(serverDef, null, null, null, true);
            var client = new Action(clientDef);
            var target = new ActionQueue();
            target.actions = [ background, client ];

            var actual = target.getServerActions();

            Assert.Equal([], actual);
            Assert.Equal([ background, client ], target.actions);
        }

        [ Fact ]
        function ReturnsServerAction() {
            var expected = new Action(serverDef);
            var target = new ActionQueue();
            target.actions = [ expected ];

            var actual = target.getServerActions();

            Assert.Equal([ expected ], actual);
            Assert.Equal([], target.actions);
        }

        [ Fact ]
        function ReturnsServerActionsFromSet() {
            var first = new Action(serverDef);
            var background = new Action(serverDef, null, null, null, true);
            var second = new Action(serverDef);
            var client = new Action(clientDef);
            var third = new Action(serverDef);
            var target = new ActionQueue();
            target.actions = [ first, background, second, client, third ];

            var actual = target.getServerActions();

            Assert.Equal([ first, second, third ], actual);
            Assert.Equal([ background, client ], target.actions);
        }
    }

    [ Fixture ]
    function GetNextBackgroundAction() {
        [ Fact ]
        function ReturnsNullIfQueueEmpty() {
            var target = new ActionQueue();

            var actual = target.getNextBackgroundAction();

            Assert.Null(actual);
        }

        [ Fact ]
        function ReturnsNullIfNoBackgroundActions() {
            var server = new Action(serverDef);
            var client = new Action(clientDef);
            var target = new ActionQueue();
            target.actions = [ server, client ];

            var actual = target.getNextBackgroundAction();

            Assert.Null(actual);
            Assert.Equal([ server, client ], target.actions);
        }

        [ Fact ]
        function ReturnsFirstFromFront() {
            var expected = new Action(serverDef, null, null, null, true);
            var other = new Action(serverDef, null, null, null, true);
            var server = new Action(serverDef);
            var client = new Action(clientDef);
            var target = new ActionQueue();
            target.actions = [ expected, other, server, client ];

            var actual = target.getNextBackgroundAction();

            Assert.Equal(expected, actual);
            Assert.Equal([ other, server, client ], target.actions);
        }

        [ Fact ]
        function ReturnsFirstFromEnd() {
            var server = new Action(serverDef);
            var client = new Action(clientDef);
            var expected = new Action(serverDef, null, null, null, true);
            var target = new ActionQueue();
            target.actions = [ server, client, expected ];

            var actual = target.getNextBackgroundAction();

            Assert.Equal(expected, actual);
            Assert.Equal([ server, client ], target.actions);
        }
    }
};
