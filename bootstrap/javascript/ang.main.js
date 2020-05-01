angular.module('blobs', ['ysilvela.socket-io']);

angular.module('blobs').factory('socket', ['socketFactory', function (socketFactory) {
  return socketFactory();
}]);
