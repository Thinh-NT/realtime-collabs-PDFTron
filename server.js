window.Server = function () {
    
    var firebaseConfig = {
        apiKey: "AIzaSyBstj57SwN_4pM4GTjQCtrW2lsFoUSBcxs",
        authDomain: "collab-28cd7.firebaseapp.com",
        projectId: "collab-28cd7",
        storageBucket: "collab-28cd7.appspot.com",
        messagingSenderId: "37337198932",
        appId: "1:37337198932:web:7bb127454facb56b7518c1"
    };
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    console.log('this: ', this)
    this.annotationsRef = firebase.database().ref().child('annotations');
    this.authorsRef = firebase.database().ref().child('authors');
    this.widgetsRef = firebase.database().ref().child('widgets');
    this.fieldRefs = firebase.database().ref().child('field')
    
};

Server.prototype.bind = function (action, callbackFunction) {
    
    switch (action) {
        case 'onAuthStateChanged':
            firebase.auth().onAuthStateChanged(callbackFunction);
            break;
        case 'onAnnotationCreated':
            this.annotationsRef.on('child_added', callbackFunction);
            break;
        case 'onAnnotationUpdated':
            this.annotationsRef.on('child_changed', callbackFunction);
            break;
        case 'onAnnotationDeleted':
            this.annotationsRef.on('child_removed', callbackFunction);
            break;
        case 'onWidgetUpdated':
            this.widgetsRef.on('child_added', callbackFunction)
            break;
        case 'onWidgetChanged':
            this.widgetsRef.on('child_changed', callbackFunction)
            break
        case 'onFieldUpdated':
            this.fieldRefs.on('child_added', callbackFunction)
            break
        case 'onFieldChanged':
            this.fieldRefs.on('child_added', callbackFunction)
            break
        default:
            console.error('The action is not defined.');
            break;
    }
    
};

Server.prototype.checkAuthor = function (authorId, openReturningAuthorPopup, openNewAuthorPopup) {
    
    this.authorsRef.once('value', authors => {
        if (authors.hasChild(authorId)) {
            this.authorsRef.child(authorId).once('value', author => {
                openReturningAuthorPopup(author.val().authorName);
            });
        } else {
            openNewAuthorPopup();
        }
    });
    
};

Server.prototype.signInAnonymously = function () {
    
    firebase.auth().signInAnonymously().catch(error => {
        if (error.code === 'auth/operation-not-allowed') {
            alert('You must enable Anonymous auth in the Firebase Console.');
        } else {
            console.error(error);
        }
    });
    
};

Server.prototype.createAnnotation = function (annotationId, annotationData) {
    this.annotationsRef.child(annotationId).set(annotationData);
};

Server.prototype.updateAnnotation = function (annotationId, annotationData) {
    this.annotationsRef.child(annotationId).set(annotationData);
};

Server.prototype.deleteAnnotation = function (annotationId) {
    this.annotationsRef.child(annotationId).remove();
};

Server.prototype.updateWidget = function (widgetID, widgetData) {
    this.widgetsRef.child(widgetID).set(widgetData)
}

Server.prototype.changeWidget = function (widgetID, widgetData) {
    this.widgetsRef.child(widgetID).set(widgetData)
}

Server.prototype.updateAuthor = function (authorId, authorData) {
    this.authorsRef.child(authorId).set(authorData);
};

Server.prototype.updateField = function (authorId, authorData) {
    this.fieldRefs.child(authorId).set(authorData);
};
