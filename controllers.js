
projectManager.controller( 'ProjectController',
	function ProjectController ( $scope, $http ) {
		var url = "data.json";
		//will change to database.js hopefully
		$scope.fetch = function() {
			
			$http({
				method: "GET",
				url: url,
			})
			.success(function(data){
				$scope.projects = data.projects;
				$scope.teams = data.teams;
			})
			.error(function(data){
				$scope.data = data || "Error occured in retrieving data";
			});

			
		};

		$scope.push = function( data ) {
			$http.post(url, data);
		}
		
	/*
		$scope.projects = [{
			title: 'My First Project',
			description:'A fun and easy way to record your meals!',
			duedate: '09-01-2013',
			team: 'the Frozen Yogurts'
		},
		{
			title: 'Project title',
			description: 'Description of said project',
			duedate: 'due date of project',
			team: 'name of team working on project'
		}];
		
		$scope.teams=[{
			name: "Awesome",
			members: ["Cameron", "Corey", "Jeff"],
			positions: ["Programmer", "Designer", "Project Owner"]
		}];
*/	
	
	

		$scope.fetch();
	});


projectManager.controller( 'AddController',
	function AddController ( $scope, $routeParams, $location ) {
		$scope.add = function( project ) {
			$scope.projects.push( project );
			$location.path( "#/" );
		}
		//parameter should not be there
		$scope.reset = function( project ) {
			$scope.project = '';
		}
	})
projectManager.controller( 'DeleteController',
	function DeleteController ( $scope, $routeParams ) {
		//Not permanent, will look into that later
		$scope.projects.splice( $routeParams.id, 1 );
		
		
	})
projectManager.controller( 'DetailController',
	function DetailController ( $scope, $routeParams ) {
		
		$scope.project = $scope.projects[ $routeParams.id ];
	})
projectManager.controller( 'EditController',
	function EditController ( $scope, $routeParams, $location ) {
		
		$scope.project = $scope.projects[ $routeParams.id ];
		
		$scope.update = function( project ) {
			$scope.projects[ $routeParams.id ] = project;
			$location.path( "#/" );
		}
		$scope.reset = function() {
			$scope.project = '';
		}
	})
projectManager.controller( 'TeamDetailController' ,
	function TeamDetailController ($scope, $routeParams ) {
		
		$scope.getID = function () {
			return $routeParams.id;
		}
		$scope.team = $scope.teams[ $routeParams.id ];
	})
projectManager.controller( 'AddTeamController' ,
	function AddTeamController ($scope, $routeParams, $location) {
		$scope.add = function( team ) {
			team.members = [];
			team.positions = [];
			$scope.teams.push( team );
			//$location.path( "#/" );
	
		}
	})

projectManager.controller( 'AddMemberController', 
	function AddTeamMember ($scope, $routeParams, $location) {
		var id = $routeParams.id;
		console.log( $routeParams.id );
		console.log( "something should be before this" );
		$scope.add = function( member ) {
			console.log( member.position );
			$scope.teams[id].members.push( member.first_name + " " + member.last_name);
			$scope.teams[id].positions.push( member.position );
		}
	});
