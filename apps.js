var projectManager = angular.module( "projectManager", [] );

projectManager.config( function ( $routeProvider ){
	$routeProvider
	.when("/", {
		templateUrl: "partials/list.html"
		
	})
	.when("/add", {
		templateUrl: "partials/add.html"
	})
	.when("/delete/:id", {
		templateUrl: "partials/list.html",
		controller: "DeleteController"
	})
	.when("/detail/:id", {
		templateUrl: "partials/detail.html",
		controller: "DetailController"
	})
	.when("/edit/:id", {
		templateUrl: "partials/edit.html"
	})
	.when("/team/detail/:id", {
		templateUrl: "partials/teamdetail.html",
		controller: "TeamDetailController"
	})
	.when("/team/add", {
		templateUrl: "partials/addteam.html",
		controller: "AddTeamController"
	})
	.when("/team/member/add/:id", {
		templateUrl: "partials/addmember.html"
	})
	.otherwise(
	{
		redirectTo: '/'
	})
	

});