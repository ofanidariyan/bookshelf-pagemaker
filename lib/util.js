// utility module that will hold common functions
module.exports = function(bookshelf) {
	
	
	
	
	
	// unique queries or settings that are database specific go here
	// only supported knex databases
	var dbTypes = {
			"mysql": {
				"regex": function(compareTo, regex) {
					return compareTo + " REGEXP '" + regex + "' AND ";
				}
			},
			"postgres": {
				"regex": function(compareTo, regex) {
					return compareTo + " ~ '" + regex + "' AND ";
				}
			},
			"maria": {
				"regex": function(compareTo, regex) {
					return compareTo + " REGEXP '" + regex + "' AND ";
				}
			},
			"sqlite3": {
				"regex": function(compareTo, regex) {
					return compareTo + " REGEXP '" + regex + "' AND ";
				}
			},
			"oracle": {
				"regex": function(compareTo, regex) {
					return "REGEXP_LIKE(" + compareTo + ",'" + regex + "') AND ";
				}
			}
	};
	
	
	
	
	
	// function to get the total records for a specific table
	// returns the count as a promise
	function getTotalRecords(tableName) {
		return bookshelf.knex.select()
		.table(tableName)
		.count('* as CNT')
		.then(function(count) {
			return count[0].CNT;
		});
	}
	
	
	
	
	
	// function to get the total filtered results
	function getTotalFilteredRecords(tableName, filterSQL) {
		return bookshelf.knex.select()
		.table(tableName)
		.count('* as CNT')
		.whereRaw(filterSQL)
		.then(function(count) {
			return count[0].CNT;
		});
	}
	
	
	
	
	// searches an array of objects for a specific key value and returns
	// a specified key value that may be the same or different
	function getObjectValue(objArray, findKey, findValue, returnKey) {
		
		if (Array.isArray(objArray)) {
			for (var i = 0; i < objArray.length; i++) {
				var o = objArray[i];
				if (o.hasOwnProperty(findKey) &&
						o.hasOwnProperty(returnKey) &&
						o[findKey] === findValue) {
					return o[returnKey];
				}
			}
		}
		
		return '';
	}
	
	
	
	
	
	// generate a concat string of searchable columns
	function getColumnConcatSQL(info, params) {
		
		var sql = '';
		var keys = Object.keys(info);
		
		for(var i = 0; i < keys.length; i++) {
			
			var colName = keys[i];
			var colData = info[colName];
			
			// check for datatables format input
			if (typeof (params.columns) === 'object') {
				var searchable = getObjectValue(params.columns, 'data', colName, 'searchable');
				sql += (searchable === 'true') ? ',`' + colName + '`' : '';
			}
			else {
				sql += ',`' + colName + '`';
			}
		}

		return "concat_ws('|'" + sql + ")";
	}
	
	
	
	
	
	// function to get sql for each keyword
	function getKeywordSQL(keyString, compareTo) {
		
		var sql = '';
		var keywords = keyString.match(/("[^"]+"|[^\s]+)/g);
		
		if (Array.isArray(keywords)) {
			for (var i = 0; i < keywords.length; i++) {
				var kw = keywords[i].replace(/"/g, '');
				sql += (kw !== '') ? compareTo + " like '%" + kw + "%' and " : '';
			}
		}
		
		return sql;
	}
	
	
	
	
	
	// function to get regex sql
	function getRegexSQL(regex, compareTo) {
		
		var sql = '';
		var dbType = bookshelf.knex.client.config.client;
		
		// make regex usable in sql
		regex = regex.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
		
		// make sure the type has a supported regex function
		if (typeof (dbTypes[dbType]) === 'object' &&
				dbTypes[dbType].hasOwnProperty('regex')) {
			sql += dbTypes[dbType].regex(compareTo, regex);
		}
		
		return sql;
	}
	
	
	
	
	
	// get either keyword or regex sql
	function getFilterTypeSQL(obj, compareTo) {
		
		var sql = '';
		
		if (typeof (obj.search) === 'object' && obj.search.value !== '') {
			if (obj.search.regex === 'false') {
				sql += getKeywordSQL(obj.search.value, compareTo);
			}
			else if (obj.search.regex === 'true') {
				sql += getRegexSQL(obj.search.value, compareTo);
			}
		}
		
		return sql;
	}
	
	
	
	
	
	// function to get the filter sql
	function getFilterSQL(concatSQL, params) {
		
		// get the main search sql
		var sql = getFilterTypeSQL(params, concatSQL);
		
		// check each column for a search if columns exist
		if (typeof (params.columns) === 'object' && Array.isArray(params.columns)) {
			for (var j = 0; j < params.columns.length; j++) {
				var col = params.columns[j];
				sql += getFilterTypeSQL(col, col.data);
			}
		}
		
		// add an always true statement to either follow any ANDs
		// or to return something for the whereRaw function
		sql += ' 1 = 1';
		
		return sql;
	}
	
	
	
	
	// return all the public functions
	return {
		getTotalRecords: getTotalRecords,
		getTotalFilteredRecords: getTotalFilteredRecords,
		getObjectValue: getObjectValue,
		getColumnConcatSQL: getColumnConcatSQL,
		getFilterSQL: getFilterSQL,
		dbTypes: dbTypes
	};
};