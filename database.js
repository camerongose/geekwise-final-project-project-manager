require([
	'geekwise-clientside-db-master/src/js/asyncdb',
	'geekwise-clientside-db-master/src/js/randoms'
	],function ( DB, Randoms ) {
		var schema = {
	        users: {
	            firstName: 'string:min[1]:max[20]',
	            lastName: 'string:max[20]',
	        },
	        projects: {
	            title: 'string',
	            description: 'string',
	            team: 'array:ref=users',
	            status: 'string',
	        }
	    };


	    var query = ( function () {
	    	var queue = [];
	    	var running = false;

	    	function execute() {
	    		if ( queue.length === 0 ) {
	    			running = false;
	    			return;
	    		}

	    		function callback( res ) {
	    			console.log('===============');
	    			console.log( args );
	    			console.log( res );
	    			console.log('latency: ' + (Date.now() - start) + 'ms');
	    			execute();
	    		}
	    		running = true;
	    		var start = Date.now();
	    		var args = queue.splice(0, 1)[0];
	    		var operation = args[0];
	    		var key = args[1];
	    		var value = args[2];

	    		if (value !== undefined ) {
	    			db[operation](key, value, callback);
	    		} else {
	    			db[operation](key, callback);
	    		}
	    	}

	    	return function query(operation, key, value) {
	    		queue.push([operation, key, value]);

	    		if( !running ) {
	    			execute();
	    		}
	    	};
	    })();

	} );