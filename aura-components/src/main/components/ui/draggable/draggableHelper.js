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
({
	$dropOperationStatus$: null,
	
	resetCssClass: function(component) {
		component.set("v.theClass", component.get("v.class"));
	},
	
	/**
	 * Handle keypress event.
	 * @param {Aura.Component} component - this component
	 * @param {Event} event - HTML DOM Event for keypress
	 */
	handleKeyPress: function(component, event) {
		// SPACE
		if (event.keyCode === 32) {
			// Stop default scroll to bottom behavior
			event.preventDefault();
			
			// Delegate drag and drop operation to accessibility component
			var accessibilityComponent = component.get("v.accessibilityComponent");
			if (accessibilityComponent) {
				var concreteCmp = $A.componentService.get(accessibilityComponent);
				if (concreteCmp.isInstanceOf("ui:dragAndDropAccessibility")) {
					concreteCmp.startDragAndDrop([component]);
				}
			}
			
			this.fireDragStart(component, true);
    	}
	},
	
	/**
	 * Handle dragstart event.
	 * @param {Aura.Component} component - this component
	 * @param {Event} event - HTML DOM Event for dragstart
	 */
	handleDragStart: function(component, event) {
		// Setting up DataTransferObject
		event.dataTransfer.effectAllowed = component.get("v.type");
		
		// Set aura-id of this draggable component so that 
		// we can pass this component to the dropzone
		event.dataTransfer.setData("aura/id", component.getGlobalId());
		
		// Set data to be transferred between drag component and drop component
		var dataTransfer = component.get("v.dataTransfer");
		if (!$A.util.isUndefinedOrNull(dataTransfer)) {
			if($A.util.isString(dataTransfer)) {
				event.dataTransfer.setData("text/plain", dataTransfer);
			} else {
				for (var key in dataTransfer) {
					if (key !== "aura/id" && dataTransfer.hasOwnProperty(key)) {
						event.dataTransfer.setData(key, dataTransfer[key]);
					}
				}
			}
		}
		
		this.fireDragStart(component, false);
	},
	
	fireDragStart: function(component, isInAccessibilityMode) {
		// Enter drag operation
		this.enterDragOperation(component, isInAccessibilityMode);
		
		// Fire dragStart event
		var dragEvent = component.getEvent("dragStart");
		dragEvent.setParams({
			"type": component.get("v.type"),
			"dragComponent": component,
			"data": component.get("v.dataTransfer"),
			"isInAccessibilityMode": isInAccessibilityMode
		});
		dragEvent.fire();
	},

	/**
	 * Handle dragend event.
	 * @param {Aura.Component} component - this component
	 * @param {Event} event - HTML DOM Event for dragend
	 */
	handleDragEnd: function(component, event) {
		var dropEffect = event.dataTransfer.dropEffect;
		this.fireDragEnd(component, dropEffect === component.get("v.type"), false);
	},
	
	fireDragEnd: function(component, isValid, isInAccessibilityMode) {
		if (component.isValid()) {
			this.exitDragOperation(component, isInAccessibilityMode);
			if (isValid) {
				// drop operation is performed
				this.updateDropOperationStatus(component, "dragEnd");
			} else {
				// drag operation is ended without performing drop operation.
				var dragEvent = component.getEvent("dragEnd");
				dragEvent.setParams({
					"type": component.get("v.type"),
					"dragComponent": component,
					
				});
				dragEvent.fire();
			}
		}
	},
	
	/**
	 * Handle dropComplete event.
	 * @param {Aura.Component} component - this component
	 * @param {Aura.Event} dragEvent - Aura Event for dropComplete. Must be of type ui:dragEvent
	 */
	handleDropComplete: function(component, dragEvent) {
		this.updateDropOperationStatus(component, "dropComplete", dragEvent);
	},
	
	/**
	 * Update drop operation status. Drop operation is considered complete when
	 * dragEnd HTML event and dropComplete Aura event have been fired. 
	 * @param {Aura.Component} component - this component
	 * @param {String} eventType - "dragEnd" for dragEnd HTML DOM Event or "dropComplete" for dropComplete Aura event
	 * @param {Aura.Event} [event] - the Aura event for dropComplete
	 */
	updateDropOperationStatus: function(component, eventType, event) {
		if (this.$dropOperationStatus$ == null) {
			this.$dropOperationStatus$ = {
				"dragEnd": null,
				"dropComplete": null,
			};
		}
		
		if (eventType === "dragEnd") {
			this.$dropOperationStatus$["dragEnd"] = {
				"type": component.get("v.type")
			};
		} else if (eventType === "dropComplete") {
			this.$dropOperationStatus$["dropComplete"] = {
				"dropComponent": event.getParam("dropComponent"),
				"status": event.getParam("dropComplete")
			};
		}
		
		// Ultimately this should be implemented with either Promise
		// or Object.observe() instead of dirty checking. However,
		// IE doesn't support either of those.
		if (this.$dropOperationStatus$["dragEnd"] !== null && this.$dropOperationStatus$["dropComplete"] !== null) {
			var dragEvent = component.getEvent("dragEnd");
			dragEvent.setParams({
				"type": this.$dropOperationStatus$["dragEnd"]["type"],
				"dragComponent": component,
				"dropComponent": this.$dropOperationStatus$["dropComplete"]["dropComponent"],
				"data": component.get("v.dataTransfer"),
				"dropComplete": this.$dropOperationStatus$["dropComplete"]["status"]
			});
			dragEvent.fire();
		}
	},
	
	/**
	 * Make this component entering drag operation.
	 * @param {Aura.Component} component - this component
	 */
	enterDragOperation: function(component, isInAccessibilityMode) {
		this.$dropOperationStatus$ = null;
		
		// set onDrag class
		var onDragClass = component.get("v.dragClass");
		if (isInAccessibilityMode) {
			var onDragAccessibilityClass = component.get("v.dragAccessibilityClass");
			if (!$A.util.isEmpty(onDragAccessibilityClass)) {
				onDragClass = onDragAccessibilityClass;
			}
		}
		component.set("v.theClass", component.get("v.class") + " " + onDragClass);
		
		// Set aria-describe
		component.set("v.ariaGrabbed", true);
	},
	
	/**
	 * Make this component exiting drag operation.
	 * @param {Aura.Component} component - this component
	 */
	exitDragOperation: function(component, isInAccessibilityMode) {
		// reset onDrag class
		this.resetCssClass(component);
		
		// Set aria-describe
		component.set("v.ariaGrabbed", false);
	}
})