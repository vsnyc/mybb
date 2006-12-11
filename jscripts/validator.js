var FormValidator = Class.create();

FormValidator.prototype = {
	validation_fields: new Object(),
	
	initialize: function(form, options)
	{
		if(!$(form))
		{
			alert("Invalid form");
		}
		Event.observe($(form), "submit", this.onSubmit.bindAsEventListener(this));
	},
	
	register: function(field, validation_type, customOptions)
	{
		options = {
			status_field: field+"_status"
		};
		Object.extend(options, customOptions || {});
		if(!$(field) && !validation_type)
		{
			return false;
		}
		if(!this.validation_fields[field])
		{
			this.validation_fields[field] = new Array();
			Event.observe($(field), "blur", this.onBlur.bindAsEventListener(this));
		}
		if(!$(options.status_field))
		{
			this.createStatusField(field);
		}
		validation_field = {field: field, validation_type: validation_type, options: options};
		this.validation_fields[field][this.validation_fields[field].length] = validation_field;	
	},
	
	onBlur: function(e)
	{
		element = Event.element(e);
		id = element.id;
		this.validateField(id);
	},
	
	validateField: function(id, twin_call, submit_call)
	{
		if(!this.validation_fields[id])
		{
			return false;
		}
		validation_field = this.validation_fields[id];
	
		for(i=0;i<validation_field.length;i++)
		{
			if(validation_field[i].validation_type == "matches")
			{
				twin = validation_field[i].options.match_field;
				if(Element.hasClassName(twin, "invalid_field"))
				{
					return false;
				}
			}
			result = this.checkValidation(id, validation_field[i].validation_type, validation_field[i].options, submit_call);
			options = validation_field[i].options;
			if(result == false)
			{
				this.showError(id, options.status_field, options.failure_message);
				// don't run any further validation routines
				return false;
			}
			else if(result == "loading")
			{
				this.showLoading(id, options.status_field, options.loading_message);
				Element.removeClassName(id, "valid_field");
				return false;
			}	
			else
			{
				ret = true;
				this.showSuccess(id, options.status_field, options.success_message);
				// Has match field
				if(options.match_field && !twin_call)
				{
					if(validation_field[i].validation_type != "matches") return true;
					ret = this.validateField(options.match_field, 1);
					if(ret == false)
					{
						Element.addClassName(id, "invalid_field");
					}
				}
			}		
		}
	},
	
	checkValidation: function(id, type, options, submit_call)
	{
		element = $(id);
		field_type = element.type.toLowerCase();
		if(typeof type == "function")
		{
			return type(id, this);
		}
		if(field_type == "radio" || field_type == "checkbox")
		{
			value = this.getCheckedValue(id);
		}
		else
		{
			value = this.getValue(id);
		}
		switch(type.toLowerCase())
		{
			case "notempty":
				if(value == null || value.length == 0) return false;
				return true;
				break;
			case "length":
				if((options.min && value.length < options.min) || (options.max && value.length > options.max)) return false;
				return true;
				break;
			case "matches":
				if(!options.match_field) return false;
				if(value != this.getValue(options.match_field))	return false;
				return true;
				break;
			case "regexp":
				regexp = new RegExp(options.regexp);
				if(!element.value.match(regexp)) return true;
				break;
			case "ajax":
				if(!options.url) return false;
				// don't ajax validate on submit
				if(submit_call) return true;
				new ajax(options.url, {method:'post', postBody:"value="+value, onComplete: function(request) { this.ajaxValidateComplete(id, options, request); }.bind(this)});
				return "loading";
				break;
		}
	},
	
	ajaxValidateComplete: function(id, options, request)
	{
		if(!request.responseXML)
		{
			alert('DEBUG: No response XML returned');
		}
		if(request.responseXML.getElementsByTagName("success").length > 0)
		{
			response = request.responseXML.getElementsByTagName("success")[0].firstChild.data;
			this.showSuccess(id, options.status_field, response);
		}
		else
		{
			response = request.responseXML.getElementsByTagName("fail")[0].firstChild.data;
			this.showError(id, options.status_field, response);
			
		}
	},
	
	onSubmit: function(e)
	{
		$H(this.validation_fields).each(function(validation_field) {
			this.validateField(validation_field.key, 0, 1);
		}.bind(this));

		errorFields = document.getElementsByClassName("invalid_field");
		if(errorFields.length > 0)
		{
			// Focus on field with first error
			errorFields[0].focus();
			Event.stop(e);
			return false;
		}
		else
		{
			return true;
		}
	},
	
	createStatusField: function(id)
	{
		element = $(id);
		status_field = document.createElement("div");
		status_field.id = id+"_status";
		status_field.style.display = "none";
		switch(element.type.toLowerCase())
		{
			case "radio":
			case "checkbox":
				element.parentNode.appendChild(status_field);
				break;
			default:
				element.parentNode.insertBefore(status_field, element.nextSibling);
		}
	},
	
	showError: function(field, area, message)
	{
		Element.removeClassName(area, "validation_success");
		Element.removeClassName(area, "validation_loading");		
		Element.addClassName(area, "validation_error");
		$(field).className = "invalid_field";
		if(!message)
		{
			message = "The value you entered is invalid";
		}
		$(area).innerHTML = message;
		$(area).style.display = "";	
	},
	
	showSuccess: function(field, area, message)
	{
		Element.removeClassName(area, "validation_error");
		Element.removeClassName(area, "validation_loading");		
		Element.addClassName(area, "validation_success");
		$(field).className = "valid_field";
		if(message)
		{
			$(area).innerHTML = message;
			$(area).style.display = "";		
		}
		else
		{
			$(area).style.display = "none";
		}
	},
	
	showLoading: function(field, area, message)
	{
		Element.removeClassName(area, "validation_success");
		Element.removeClassName(area, "validation_error");		
		Element.addClassName(area, "validation_loading");
		if(!message)
		{
			message = "Checking for validity...";
		}
		$(area).innerHTML = message;
		$(area).style.display = "";	
	},
	
	getValue: function(element)
	{
		if(typeof element == "string") element = $(element);
		if(!element) return false;
		switch(element.type.toLowerCase())
		{
			case "text":
			case "password":
			case "hidden":
				return element.value;
				break;
			case "radio":
			case "checkbox":
				return element.checked;
				break;
			case "select-one":
				value = '';
				index = element.selectedIndex;
				if(index >= 0)
				{
					value = element.options[index].value;
				}
				return value;
				break;
			case "select-multiple":
				var value = new Array();
				for(var i=0;i<element.options.length;i++)
				{
					if(element.options[i].selected)
					{
						value.push(element.options[i].value);
					}
				}
				return value;
				break;
		}
	},
	
	/* Fetch the text value from a series of radio or checkbuttons. Pass one of the radio or check buttons within a group */
	getCheckedValue: function(element)
	{
		if(typeof element == "string") element = $(element);
		if(!element) return false;
		if(!element.parentNode) return false;
		var value = new Array();
		inputs = element.parentNode.getElementsByTagName('INPUT');
		for(var i=0;i<inputs.length;i++)
		{
			if(inputs[i].checked == true)
			{
				value.push(inputs[i].value);
			}
		}
		// No matches, no return value
		if(value.length == 0)
		{
			return '';
		}
		// One match, return string
		else if(value.length == 1)
		{
			return value[0];
		}
		// More than one, return array
		else
		{
			return value;
		}
	}
};