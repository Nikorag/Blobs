module.exports = {
    copy: function(source){
        return JSON.parse(JSON.stringify(source));
    }
}