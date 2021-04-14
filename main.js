
const server = new Server();

$(document).ready(() => {
    WebViewer({
        path: "lib",
        initialDoc: "PAYMENT_ORDER_TEMPLATE.pdf",
        documentId: "AĂÂ",
        showLocalFilePicker: true,
        fullAPI: true,
        disabledElements: [
            'selectToolButton',
            'searchButton',
            'panToolButton',
            'menuButton',
            'rubberStampToolGroupButton',
            'stampToolGroupButton',
            'fileAttachmentToolGroupButton',
            'calloutToolGroupButton',
            'annotationStyleEditButton', 'linkButton',
            'undoButton', 'redoButton'
        ],
        isAdminUser: true
    }, document.getElementById('viewer'))
        .then(instance => {

            const { docViewer, annotManager, Annotations } = instance;

            let PDFNet = instance.PDFNet

            let currIndex = 0;

            var widget_update = false

            async function next_field() {

                const widgetAnnotations = annotManager
                    .getAnnotationsList()
                    .filter(annot => annot instanceof Annotations.WidgetAnnotation);
                const widgetAnnot = widgetAnnotations[currIndex];
                Annotations.WidgetAnnotation.getContainerCustomStyles = widget => {
                    // use some way to find that certain widget
                    if (widget === widgetAnnot && widget._id === widgetAnnot._id) {
                        return {
                            border: '2px solid blue',
                            'background-color': 'skyblue',
                            color: 'black',
                        };
                    }
                };

                annotManager.jumpToAnnotation(widgetAnnot);
                annotManager.drawAnnotations(widgetAnnot.PageNumber, null, 1);

                currIndex = (currIndex + 1) % (widgetAnnotations.length);

                if (!widget_update) {
                    update_widget_listener()
                    widget_update = true
                }

            }

            function update_widget_listener() {
                
                const widgetAnnotations = annotManager
                    .getAnnotationsList()
                    .filter(annot => annot instanceof Annotations.WidgetAnnotation);

                for (let i = 0; i < widgetAnnotations.length; i++) {

                    const index = i
                    const widgetAnnot = widgetAnnotations[index];
                    console.log("index: ", index)

                    widgetAnnot.on('focus', () => {
                        Annotations.WidgetAnnotation.getContainerCustomStyles = widget => {
                            // use some way to find that certain widget
                            if (widget === widgetAnnot) {
                                return {
                                    'background-color': 'red',
                                    color: 'white',
                                };
                            }
                        };

                        annotManager.jumpToAnnotation(widgetAnnot);
                        annotManager.drawAnnotations(widgetAnnot.PageNumber, null, 1);
                    })
                }
                
            }

            document.getElementById('next-field').addEventListener('click', () => {
                next_field()
            })

            docViewer.on('documentLoaded', async () => {

                await PDFNet.initialize()

                globalThis.doc = await docViewer.getDocument().getPDFDoc()
                globalThis.documentId = docViewer.getDocument().getDocumentId();

                const onAnnotationCreated = async data => {

                    const annotations = await annotManager.importAnnotCommand(data.val().xfdf);
                    const annotation = annotations[0];
                    if (annotation) {
                        await annotation.resourcesLoaded();

                        annotation.authorId = data.val().authorId;
                        annotManager.redrawAnnotation(annotation);

                    }
                };

                const onAnnotationUpdated = async data => {
                    // Import the annotation based on xfdf command
                    const annotations = await annotManager.importAnnotCommand(data.val().xfdf);
                    const annotation = annotations[0];
                    console.log('annotation: ', annotations)
                    if (annotation) {
                        await annotation.resourcesLoaded();
                        // Set a custom field authorId to be used in client-side permission check
                        annotation.authorId = data.val().authorId;
                        annotManager.redrawAnnotation(annotation);
                    }
                };

                const onAnnotationDeleted = data => {
                    // data.key would return annotationId since our server method is designed as
                    // annotationsRef.child(annotationId).set(annotationData)
                    const command = `<delete><id>${data.key}</id></delete>`;
                    annotManager.importAnnotCommand(command);
                };

                const onWidgetUpdated = async data => {
                    const annotations = await annotManager.importAnnotCommand(data.val().xfdf);
                    const annotation = annotations[0];
                    if (annotation) {
                        await annotation.resourcesLoaded();
                        // Set a custom field authorId to be used in client-side permission check
                        annotation.authorId = data.val().authorId;
                        annotManager.importAnnotations(annotation);
                    }
                }


                const onWidgetChanged = async data => {
                    console.log('widget upload')
                    const annotations = await annotManager.importAnnotCommand(data.val().xfdf);
                    const annotation = annotations[0];
                    if (annotation) {
                        await annotation.resourcesLoaded();
                        annotation.authorId = data.val().authorId;
                        annotManager.importAnnotations(annotation)
                    }
                }

                const openReturningAuthorPopup = authorName => {
                    // The author name will be used for both WebViewer and annotations in PDF
                    annotManager.setCurrentUser(authorName);
                    // Open popup for the returning author
                    window.alert(`Welcome back ${authorName}`);
                };

                const updateAuthor = authorName => {
                    // The author name will be used for both WebViewer and annotations in PDF
                    annotManager.setCurrentUser(authorName);
                    // Create/update author information in the server
                    server.updateAuthor(authorId, { authorName });
                };

                const openNewAuthorPopup = () => {
                    // Open prompt for a new author
                    const name = window.prompt('Welcome! Tell us your name :)');
                    if (name) {
                        updateAuthor(name);
                    }
                };

                const onFieldUpdated = () => {

                }
                // Bind server-side authorization state change to a callback function
                // The event is triggered in the beginning as well to check if author has already signed in
                server.bind('onAuthStateChanged', user => {
                    // Author is logged in
                    if (user) {
                        // Using uid property from Firebase Database as an author id
                        // It is also used as a reference for server-side permission
                        globalThis.authorId = user.uid;
                        // Check if author exists, and call appropriate callback functions
                        server.checkAuthor(authorId, openReturningAuthorPopup, openNewAuthorPopup);
                        // Bind server-side data events to callback functions
                        // When loaded for the first time, onAnnotationCreated event will be triggered for all database entries
                        server.bind('onAnnotationCreated', onAnnotationCreated);
                        server.bind('onAnnotationUpdated', onAnnotationUpdated);
                        server.bind('onAnnotationDeleted', onAnnotationDeleted);
                        server.bind('onWidgetUpdated', onWidgetUpdated)
                        server.bind('onWidgetChanged', onWidgetChanged)
                        server.bind('onFieldUpdated', onFieldUpdated)
                    } else {
                        // Author is not logged in
                        server.signInAnonymously();
                    }
                });
            });

            annotManager.on('annotationChanged', async (annotations, type, info) => {
                // info.imported is true by default for annotations from pdf and annotations added by importAnnotCommand
                if (info.imported) {
                    return;
                }

                const xfdf = await annotManager.exportAnnotCommand();
                // Iterate through all annotations and call appropriate server methods
                annotations.forEach(annotation => {
                    let parentAuthorId = null;
                    if (type === 'add') {
                        // In case of replies, add extra field for server-side permission to be granted to the
                        // parent annotation's author
                        if (annotation.InReplyTo) {
                            parentAuthorId = annotManager.getAnnotationById(annotation.InReplyTo).authorId || 'default';
                        }

                        if (authorId) {
                            annotation.authorId = authorId;
                        }

                        server.createAnnotation(annotation.Id, {
                            authorId,
                            parentAuthorId,
                            xfdf,
                        });
                    } else if (type === 'modify') {
                        // In case of replies, add extra field for server-side permission to be granted to the
                        // parent annotation's author
                        if (annotation.InReplyTo) {
                            parentAuthorId = annotManager.getAnnotationById(annotation.InReplyTo).authorId || 'default';
                        }
                        server.updateAnnotation(annotation.Id, {
                            authorId,
                            parentAuthorId,
                            xfdf,
                        });
                    } else if (type === 'delete') {
                        server.deleteAnnotation(annotation.Id);
                    }
                });
            });

            annotManager.on('fieldChanged', async (annotations, type) => {
                const xfdf = await annotManager.exportAnnotCommand();
                let parentAuthorId = null
                server.changeWidget(annotations.ad, {
                    authorId,
                    parentAuthorId,
                    xfdf
                });
                console.log("Field Changed !")
            });
            annotManager.setPermissionCheckCallback((author, annotation) => annotation.authorId === authorId);
        });
});
