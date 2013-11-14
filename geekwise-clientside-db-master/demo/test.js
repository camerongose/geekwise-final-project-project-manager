var test = angular.module( "test", []);
test.controller( 'TestController', 
	function TestController ( $scope, $http ) {
		var url = 'app.js';
		//console.log( url );
		console.log( "setting a query" );
		//Is only happy if on one line
		//There is a multiline character but it didn't seem to work
		 query('create', 'users', {
	        firstName: 'John',
	        lastName: 'Doe',
	        nickName: 'Who?',
	        email: 'whoami@test.com',
	        id: 'x007x' // we are explicitly setting the ID
	    }, {
	        firstName: 'Betty',
	        lastName: 'Sue',
	        nickName: 'BS',
	        email: 'bs@test.com'
    	});

    	console.log( query );
    	console.log( "posting query" );
    	//$http.post( url, query );
	});
