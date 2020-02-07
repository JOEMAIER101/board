class UserInteractivityBasicOperation {
  generateData(data) {
    const qnCreateTime = firebase.firestore.Timestamp.fromDate(new Date()).seconds;
    data.id = `${data.component}-${virtualclass.gObj.orginalUserId}-${qnCreateTime}`;
    data.timestamp = qnCreateTime;
    data.context = virtualclass.userInteractivity.currentContext;
    data.userId = virtualclass.gObj.orginalUserId;
    return data;
  }

  async send(data) {
    if (!virtualclass.userInteractivity.collection) {
      virtualclass.userInteractivity.setDbCollection();
      virtualclass.userInteractivity.attachHandlerForRealTimeUpdate();
    }

    if (data.component === 'note' || data.component === 'bookmark') {
      console.log('====> sending note data ', JSON.stringify(data));
      await virtualclass.userInteractivity.db.collection(virtualclass.userInteractivity.collectionMark).doc(data.id).set(data).then(() => {
        console.log('ask question write, Document successfully written! ', data);
      })
        .catch((error) => {
          console.error('ask question write, Error writing document: ', error);
        });
    } else {
      await virtualclass.userInteractivity.db.collection(virtualclass.userInteractivity.collection).doc(data.id).set(data)
        .then(() => {
          console.log('ask question write, Document successfully written! ', data);
        })
        .catch((error) => {
          console.error('ask question write, Error writing document: ', error);
        });
    }
  }

  handler(ev) {
    if (ev.target.dataset.event === 'edit') {
      const writeTemp = document.querySelector('#writeContent .action .cancel');
      if (writeTemp) {
        writeTemp.click();
      }
    }
    const questionElement = ev.target.closest('div.context');
    if (questionElement && questionElement.dataset) {
      virtualclass.userInteractivity.currentContext = ev.target.closest('div.context').dataset.context;
    }
    let event;
    let parent;
    let componentId = null;
    const target = ev.target;
    if ((this.event.values.includes(target.dataset.event))) {
      event = target.dataset.event;
      parent = target.parentNode;
    } else if (this.event.values.includes(target.parentNode.dataset.event)) {
      event = target.parentNode.dataset.event;
      parent = target.parentNode.parentNode;
    } else if (this.event.values.includes(target.parentNode.parentNode.dataset.event)) {
      event = target.parentNode.parentNode.dataset.event;
      parent = target.parentNode.parentNode.parentNode;
    }

    if (event) {
      let data;
      let text;
      let action;
      let parentId = null;
      let component = parent.dataset.component;
      if (parent.dataset.componentId && event !== 'save') {
        componentId = parent.dataset.componentId;
        if (event === 'reply') {
          componentId = null;
          parentId = parent.dataset.componentId;
        } else if (event === 'edit' || event === 'markAnswer' || event === 'delete') {
          parentId = (parent.dataset.parent) ? parent.dataset.parent : null;
        }
      }

      if (event === 'save') {
        // this.askQuestionActive();
        if (component === 'note') {
          text = target.value;
          action = 'create';
        } else if (component === 'bookmark') {
          text = (+(parent.dataset.value) === 0 ? 1 : 0);
          action = 'create';
        } else {
          if (parent.previousSibling != null && parent.previousSibling.value != null
            && parent.previousSibling.value !== '') {
            text = parent.previousSibling.value;
          } else {
            virtualclass.view.createErrorMsg(virtualclass.lang.getString('enterText'), 'errorContainer', 'videoHostContainer');
            return;
          }
          if (parent.dataset.componentId === null || parent.dataset.componentId === '') {
            action = 'create';
          } else {
            action = 'edit';
            ({ componentId } = parent.dataset);
            if (!virtualclass.vutil.checkUserRole()) {
              const editElem = virtualclass.userInteractivity.context[virtualclass.userInteractivity.currentContext][component][componentId].upvote;
              if (editElem !== 0 && editElem != null) {
                ({ componentId } = parent.dataset);
                event = 'cancel';
                virtualclass.view.createErrorMsg(virtualclass.lang.getString('upvoted'), 'errorContainer', 'videoHostContainer');
              }
            }
          }
        }
        parentId = (parent.dataset.parent) ? parent.dataset.parent : null;
      } else if (event === 'clearall') {
        const currentContextElement = document.querySelector('#noteNavigationContainer .clearAll');
        let currentContext = currentContextElement.dataset.currentContext;
        if (currentContextElement.dataset.currentContext) currentContext = currentContextElement.dataset.currentContext;

        const contentElement = document.querySelector(`#noteContainer .context[data-context~=${currentContext}] textarea`);
        if (contentElement) {
          contentElement.value = '';
          text = '';
          action = 'create';
          event = 'save';
        }
      } else if (event === 'upvote') {
        parentId = parent.dataset.parent;
      }

      data = {
        event, component, componentId, text, action, parentId
      };
      this.event.execute(data);
      if (event === 'cancel' || event === 'save') {
        this.inputGenerating = false;
        if (this.pollInputGeneratingTime) {
          clearTimeout(this.pollInputGeneratingTime);
          console.log('I have cleared my polling time');
        }
        virtualclass.userInteractivity.rendererObj.removeWriteContainer();
        if (roles.isStudent() && this.donotChangeContext && this.donotChangeContext !== this.currentContext) {
          console.log('Triggered performed 1');
          this.triggerPerform(this.donotChangeContext);
          delete this.donotChangeContext;
        }
      }
    }
  }

  askQuestionActive() {
    const time = new Date().getTime();
    const msgobj = {
      receiver: 'askQuestion', cf: 'msg', time, userId: virtualclass.gObj.uid,
    };
    ioAdapter.mustSend(msgobj);
  }

  userInputHandler(component) {
    if (roles.isStudent()) {
      virtualclass.userInteractivity.inputGenerating = true;
      console.log('====> Input is generating ', virtualclass.userInteractivity.inputGenerating);
      if (this.pollInputGeneratingTime) clearTimeout(this.pollInputGeneratingTime);
      this.pollInputGeneratingTime = setTimeout(() => {
        virtualclass.userInteractivity.inputGenerating = false;
        console.log('====> Input is generating ', virtualclass.userInteractivity.inputGenerating);
        if (virtualclass.userInteractivity.donotChangeContext) {
          console.log('Triggered performed 2');
          virtualclass.userInteractivity.triggerPerform(virtualclass.userInteractivity.donotChangeContext);
          delete virtualclass.userInteractivity.donotChangeContext;
          document.querySelector('#writeContent .cancel').click();
        }
      }, 17000);
    }
    const textarea = document.querySelector('#writeContent .text');
    virtualclass.userInteractivity.rendererObj.autosize.call(this, {target: textarea});
  }

  renderer(data) {
    this.rendererObj[data.type].call(this.rendererObj, data);
  }

  create(data) {
    if (data.userId === virtualclass.gObj.orginalUserId) {
      const textTemp = document.querySelector('#writeContent');
      if (textTemp) {
        textTemp.remove();
      }
    }
    data.componentId = data.id;
    this.renderer(data);
    this.updateStatus(data, 'editable');
  }

  delete(data) {
    const elem = document.querySelector(`#${data.componentId}`);
    if (elem) {
      elem.remove();
      this.updateStatus(data, 'delete');
    }
  }

  // deleteComponentVariable(component, componentId, parent, parentId) {
  //   if (!this.tobeDeleted) {
  //     return;
  //   }
  //   const contextObj = virtualclass.userInteractivity.context;
  //   const currentContext = virtualclass.userInteractivity.currentContext;
  //   let childrenArr = contextObj[currentContext][component][componentId].children;
  //
  //   if (childrenArr.length <= 0) {
  //     delete contextObj[currentContext][component][componentId];
  //     if (parent) {
  //       childrenArr = contextObj[currentContext][parent][parentId].children;
  //     }
  //   }
  //
  //   if (childrenArr.length > 0) {
  //     const removedId = childrenArr.shift();
  //     let newComponent;
  //     if (component === 'question') {
  //       newComponent = 'answer';
  //     } else if (component === 'answer') {
  //       newComponent = 'comment';
  //     } else {
  //       newComponent = 'comment';
  //     }
  //     this.deleteComponentVariable(newComponent, removedId, component, parentId);
  //   }
  // }

  // TODO, This whole deleting process should be simplified, It can not be ignored
  deleteComponentVariableHelper(data) {
    if (data.component === 'question') {
      this.deleteQuestionVariable(data.componentId);
    } else if (data.component === 'answer') {
      this.deleteAnswerVariable(data.componentId);
    } else if (data.component === 'comment') {
      this[`deleteCommentVariableLevel${data.level}`](data.componentId);
    }
  }

  deleteQuestionVariable(componentId) {
    const component = 'question';
    const contextObj = virtualclass.userInteractivity.context;
    const currentContext = virtualclass.userInteractivity.currentContext;
    const childrenArr = contextObj[currentContext][component][componentId].children;
    for (let i = 0; i < childrenArr.length; i++) {
      this.deleteAnswerVariable(childrenArr[i]);
    }
    delete contextObj[currentContext][component][componentId];
  }

  deleteAnswerVariable(componentId) {
    const component = 'answer';
    const contextObj = virtualclass.userInteractivity.context;
    const currentContext = virtualclass.userInteractivity.currentContext;
    const childrenArr = contextObj[currentContext][component][componentId].children;
    for (let i = 0; i < childrenArr.length; i++) {
      this.deleteCommentVariableLevel1(childrenArr[i]);
    }
    delete contextObj[currentContext][component][componentId];
  }

  deleteCommentVariableLevel1(componentId) {
    const component = 'comment';
    const contextObj = virtualclass.userInteractivity.context;
    const currentContext = virtualclass.userInteractivity.currentContext;
    const childrenArr = contextObj[currentContext][component][componentId].children;
    for (let i = 0; i < childrenArr.length; i++) {
      this.deleteCommentVariableLevel2(childrenArr[i]);
    }
    delete contextObj[currentContext][component][componentId];
  }

  deleteCommentVariableLevel2(componentId) {
    const component = 'comment';
    const contextObj = virtualclass.userInteractivity.context;
    const currentContext = virtualclass.userInteractivity.currentContext;
    const childrenArr = contextObj[currentContext][component][componentId].children;
    for (let i = 0; i < childrenArr.length; i++) {
      this.deleteCommentVariableLevel3(childrenArr[i]);
    }
    delete contextObj[currentContext][component][componentId];
  }

  deleteCommentVariableLevel3(componentId) {
    const component = 'comment';
    const contextObj = virtualclass.userInteractivity.context;
    const currentContext = virtualclass.userInteractivity.currentContext;
    const childrenArr = contextObj[currentContext][component][componentId].children;
    for (let i = 0; i < childrenArr.length; i++) {
      delete contextObj[currentContext][component][childrenArr[i]];
    }
    delete contextObj[currentContext][component][componentId];
  }

  updateStatus(data, status) {
    let getChildren;
    const contextObj = virtualclass.userInteractivity.context;
    const currentContext = virtualclass.userInteractivity.currentContext;
    let component;
    let parent = null;
    if (status === 'delete') {
      this.updateCount(data, status);
      // const filterComponent = data.component === 'question' ? 'answer' : 'comment';
      // const childrenArr = contextObj[currentContext][data.component][data.componentId].children;
      // if (childrenArr.length > 0 && roles.hasControls()) {
      //   for (let i = 0; i < childrenArr.length; i++) {
      //     delete contextObj[currentContext][filterComponent][childrenArr[i]];
      //   }
      // }
      // delete contextObj[currentContext][data.component][data.componentId];
      this.deleteComponentVariableHelper(data);
    } else if (status === 'editable' || status === 'edited') {
      component = data;
      if (status === 'editable') {
        // component = { id: data.id, content: data.content, children: [], status, parent: null, componentId: data.id, upvote: 0 };
        component.upvote = 0;
        component.children = [];

        if (data.component === 'comment' && data.level >= 3) {
          const commentElem = document.querySelector(`#${data.componentId}`);
          if (commentElem) {
            commentElem.dataset.status = 'reachMaxLimit';
          }
        } else if (data.component === 'answer') {
          const answerElem = document.querySelector(`#askQuestion #${data.parent} .answers`);
          if (answerElem.classList.contains('close')) {
            answerElem.classList.remove('close');
            answerElem.classList.add('open');
          }
        }
        this.updateCount(data, status);
        virtualclass.vutil.attachWhiteboardPopupHandler();
      } else if (status === 'edited') {
        component.children = contextObj[currentContext][data.component][data.componentId].children;
        component.content = data.content;
      }
      component.status = status;
      contextObj[currentContext][data.component][data.componentId] = component;
    } else if (status === 'upvote') {
      if (data.component === 'question' || data.component === 'answer') {
        getChildren = contextObj[currentContext][data.component][data.componentId].children;
      }
      component = { id: data.id, content: data.content, children: getChildren, status, parent: data.parent, componentId: data.componentId, upvote: data.upvote, upvoteBy: data.upvoteBy };
      component.status = status;
      contextObj[currentContext][data.component][data.componentId] = component;
    }
  }

  updateCount(data, status) {
    const contextObj = virtualclass.userInteractivity.context;
    let component = data.component === 'answer' ? 'question' : 'answer';
    if (data.parent != null && (data.parent).split('-')[0] === 'comment') {
      component = 'comment';
    }
    if (contextObj[data.context] && contextObj[data.context][component] && Object.prototype.hasOwnProperty.call(contextObj[data.context][component], data.parent) && data.component !== 'question') {
      const children = contextObj[data.context][component][data.parent].children;
      const moreControlElem = document.querySelector(`#${data.parent}`);
      const controlNavigation = document.querySelector(`#${data.parent} .footer .navigation`);
      if (data.component === 'answer' || data.component === 'comment') {
        if (status === 'editable') {
          children.push(data.componentId);
          if (!virtualclass.vutil.checkUserRole()) {
            if (moreControlElem) {
              moreControlElem.classList.remove('editable');
              moreControlElem.classList.add('noneditable');
            }
          }
          if (controlNavigation && controlNavigation.classList.contains('disable')) {
            controlNavigation.classList.remove('disable');
          }
        } else {
          children.splice(children.indexOf(data.componentId), 1);
          const userId = (data.parent).split('-')[1];
          const time = virtualclass.userInteractivity.questionAnswer.elapsedComponentTime({ componentId: data.parent, component: component });
          const componentUpvote = virtualclass.userInteractivity.context[virtualclass.userInteractivity.currentContext][component][data.parent].upvote;
          const getParentElem = document.querySelector(`#${data.parent} .upVote .total`); // TODO handle using component data
          if (!virtualclass.vutil.checkUserRole() && (time < 30 && getParentElem && componentUpvote === 0)
            || (component === 'comment' && userId === virtualclass.gObj.orginalUserId)) {
            if (children.length === 0) {
              if (moreControlElem) {
                moreControlElem.classList.remove('noneditable');
                moreControlElem.classList.add('editable');
              }
            }
          }

          if (children.length === 0) {
            if (!controlNavigation.classList.contains('disable')) {
              controlNavigation.classList.add('disable');
            }
          }

          if (component === 'question' && !virtualclass.vutil.checkUserRole()) {
            const answersElem = document.querySelectorAll(`#askQuestion #${data.parent} .answers .answer`);
            for (let i = 0; i < answersElem.length; i++) {
              const anstime = virtualclass.userInteractivity.questionAnswer.elapsedComponentTime({ componentId: data.componentId, component: 'answer' });
              const ansUpvote = virtualclass.userInteractivity.context[virtualclass.userInteractivity.currentContext]['answer'][data.componentId].upvote;
              const ansChildren = contextObj[data.context]['answer'][data.componentId].children;
              if (answersElem[i].classList.contains('noneditable') && ansUpvote === 0 && ansChildren.length === 0 && anstime < 30) {
                answersElem[i].classList.remove('noneditable');
                answersElem[i].classList.add('editable');
              }
            }
          }

          if (data.component === 'answer') {
            const checkMarkElem = document.querySelector(`#askQuestion #${data.parent} .answers .answer[data-mark-answer="marked"]`);
            if (!checkMarkElem) {
              const markParentElem = document.querySelector(`#${data.parent}`);
              markParentElem.dataset.markAnswer = '';
            }
          }
        }
        const parentElem = document.querySelector(`#${data.parent} .navigation .total`);
        if (parentElem) {
          parentElem.innerHTML = contextObj[data.context][component][data.parent].children.length;
        }
      }
    }
  }

  edit(data) {
    virtualclass.userInteractivity.questionAnswer.separatedContent(data);
    document.querySelector(`#${data.componentId} .lable`).innerHTML = `${data.component} (edited)`;
    const textTemp = document.querySelector('#writeContent');
    if (textTemp) {
      textTemp.remove();
    }
    this.updateStatus(data, 'edited');
  }

  upvote(data) { // main part
    if (data.upvote) {
      if (data.upvote === 1) virtualclass.userInteractivity.firstid = data.id;
      document.querySelector(`#${data.componentId} .upVote .total`).innerHTML = data.upvote;
      if (data.upvoteBy[data.upvoteBy.length - 1] === virtualclass.gObj.orginalUserId) {
        document.querySelector(`#${data.componentId} .upVote`).dataset.upvote = 'upvoted';
      } else {
        const checkIndex = data.upvoteBy.indexOf(virtualclass.gObj.orginalUserId);
        if (checkIndex > -1) {
          document.querySelector(`#${data.componentId} .upVote`).dataset.upvote = 'upvoted';
        }
      }
      if (!virtualclass.vutil.checkUserRole()) {
        const upvoteElement = document.querySelector(`#${data.componentId}`);
        upvoteElement.classList.remove('editable');
        upvoteElement.classList.add('noneditable');
      }
      this.updateStatus(data, 'upvote');
      this.mostUpvotedOnTop(data);
    } else {
      // TODO
      document.querySelector(`#${data.componentId} .upVote`).dataset.upvote = 'upvoted';
    }
  }

  markAnswer(data) { // question part
    const parent = document.querySelector(`#askQuestion #${data.parent} .answers .answer[data-mark-answer="marked"]`);
    const markParentElem = document.querySelector(`#${data.parent}`);
    const markedAnswer = document.querySelector(`#askQuestion #${data.parent} .answers`);
    const changeElemName = document.querySelector(`#askQuestion #${data.parent} .answers #${data.componentId} .moreControls .mark`);
    const checkElemDataset = document.querySelector(`#askQuestion #${data.parent} .answers #${data.componentId}`);
    if (parent && markParentElem.dataset.markAnswer) {
      if (parent && checkElemDataset && checkElemDataset.dataset.markAnswer !== 'marked') {
        if (virtualclass.vutil.checkUserRole()) {
          // virtualclass.view.createErrorMsg(virtualclass.lang.getString('markAnswerUnmark'), 'errorContainer', 'videoHostContainer');
        }
        return;
      }
      delete parent.dataset.markAnswer;
      delete markParentElem.dataset.markAnswer;
      if (markedAnswer.classList.contains('close')) {
        markedAnswer.classList.remove('close');
        markedAnswer.classList.add('open');
      }
      if (changeElemName) {
        changeElemName.innerHTML = 'Mark As Answer';
        return;
      } else if (!changeElemName) {
        return;
      }
    } else {
      if (changeElemName) {
        if (changeElemName.innerHTML === 'Mark As Answer') {
          changeElemName.innerHTML = 'Unmark';
        }
      }
    }
    const markElem = document.querySelector(`#${data.componentId}`);
    if (markParentElem && markElem && !markParentElem.dataset.markAnswer) {
      markElem.dataset.markAnswer = 'marked';
      markParentElem.dataset.markAnswer = 'marked';
      if (markedAnswer.classList.contains('open')) {
        markedAnswer.classList.remove('open');
        markedAnswer.classList.add('close');
      }
      markedAnswer.insertBefore(markElem, markedAnswer.firstChild);
      if (!virtualclass.vutil.checkUserRole()) {
        const answersElem = document.querySelectorAll(`#askQuestion #${data.parent} .answers .answer`);
        for (let i = 0; i < answersElem.length; i++) {
          if (answersElem[i].classList.contains('editable')) {
            answersElem[i].classList.remove('editable');
          }
          answersElem[i].classList.add('noneditable');
        }
      }
    }
  }

  mostUpvotedOnTop(data) { // main part
    let getChildren;
    const arr = [];
    const context = virtualclass.userInteractivity.context;
    const currentContext = data.context
    if (data.component === 'answer') {
      getChildren = context[currentContext]['question'][data.parent].children;
    }
    for (const component in context[currentContext][data.component]) {
      if (component !== 'events' && component !== 'orderdByUpvoted') {
        const obj = {
          componentId: component,
          upvote: context[currentContext][data.component][component].upvote,
        };
        if (data.component === 'answer') {
          const checkAns = getChildren.indexOf(component);
          if (checkAns !== -1) {
            arr.push(obj);
          }
        } else if (data.component === 'question') {
          arr.push(obj);
        }
      }
    }
    arr.sort((a, b) => b.upvote - a.upvote);
    if (data.component === 'question') {
      context[currentContext][data.component].orderdByUpvoted = arr;
    } else {
      if (!context[currentContext][data.component].hasOwnProperty('orderdByUpvoted')) {
        context[currentContext][data.component].orderdByUpvoted = { };
      }
      context[currentContext][data.component].orderdByUpvoted[data.parent] = arr;
    }
    const container = document.createElement('div');
    container.className = data.component === 'question' ? 'container' : 'answers open';
    if (data.component === 'question') {
      for (let i = 0; i < context[currentContext][data.component]['orderdByUpvoted'].length; i++) {
        container.appendChild(document.querySelector(`#${context[currentContext][data.component]['orderdByUpvoted'][i].componentId}`));
      }
    } else {
      const ansObj = context[currentContext][data.component].orderdByUpvoted;
      for (let i = 0; i < ansObj[data.parent].length; i++) {
        container.appendChild(document.querySelector(`#${ansObj[data.parent][i].componentId}`));
      }
    }

    const replaceContainer = data.component === 'question' ? '.container' : `#${data.parent} .answers`;
    const elem = document.querySelector(`#askQuestion [data-context~=${currentContext}] ${replaceContainer}`);
    document.querySelector(`#askQuestion [data-context~=${currentContext}] ${replaceContainer}`).parentNode.replaceChild(container, elem);
  }
}

class QAcontext {
  constructor() {
    this.actions = [];
    this.question = {};
    this.answer = {};
    this.comment = {};
    this.note = {};
    this.bookmark = {};
  }
} // main part


class UserInteractivity extends UserInteractivityBasicOperation {
  init() {  // Main part
    if (this.initialize) return;
    this.queue = {};
    this.queue.note = [];
    this.queue.question = [];
    this.queue.bookmark = [];
    this.context = {};
    this.firstRealTime = true;
    this.initialize = true;
    this.allMarks = {};
    this.note = new Note();
    this.event = new UserInteractivityEvents();
    this.engine = new UserInteractivityEngine();
    this.rendererObj = new UserInteractivityRenderer();
    this.rendererObj.mainInterface();
    this.questionAnswer = new QuestionAnswer();
    this.bookmark = new Bookmark(); // Bookmark  ()
    this.attachHandler();
    this.viewAllMode = false;
    this.inputGenerating = false;
  }

  attachHandler() { // Main part
    this.bookmark.attachHandler();
    if (virtualclass.isPlayMode) {
      const viewAllQuestion = document.getElementById('viewAllQuestion');
      viewAllQuestion.addEventListener('click', this.viewAllQuestion.bind(this));
    }
  }

  viewAllQuestion(ev) { // Question part
    this.triggerPause();
    const viewAllQuestion = document.getElementById('viewAllQuestion');
    const viewAllAction = ev.currentTarget.dataset.viewall;
    const askQuestion = document.getElementById('askQuestion');
    if (askQuestion != null) {
      const rightPanel = document.getElementById('virtualclassAppRightPanel');
      const currentContext = document.querySelector('#askQuestion .container .current');
      if (currentContext) { currentContext.classList.remove('current'); }

      if (viewAllAction === 'enable') {
        if (rightPanel) { rightPanel.classList.add('viewAllMode'); }
        askQuestion.classList.add('viewAll');
        viewAllQuestion.dataset.viewall = 'disable';
        if (!this.viewAllTriggered) {
          for (const context in virtualclass.userInteractivity.queue.question) {
            if (!this.context[context]) {
              this.context[context] = new QAcontext();
            }
            this.triggerPerform(context);
          }
        }
        this.viewAllTriggered = true;
        this.viewAllMode = true;
      } else {
        virtualclass.userInteractivity.currentContext = virtualclass.userInteractivity.readyContextActual();
        if (rightPanel) { rightPanel.classList.remove('viewAllMode'); }
        askQuestion.classList.remove('viewAll');
        viewAllQuestion.dataset.viewall = 'enable';
        const currentContextElement = document.querySelector(`#askQuestion .context[data-context~=${virtualclass.userInteractivity.currentContext}]`);
        currentContextElement.classList.add('current');
        this.viewAllMode = false;
      }
    }
  }

  async initFirebaseOperatoin() { // main part
    if (this.initFirebase) return;
    const virtualclassCont = document.getElementById('virtualclassCont');
    if (virtualclassCont) virtualclassCont.classList.add('askQuestionFetching');
    this.initFirebase = true;
    const config = {
      apiKey: 'AIzaSyDx4OisyZGmbcAx57s0zlwRlopPNNDqxSs',
      authDomain: 'vidyamantra-congrea.firebaseapp.com',
      databaseURL: 'https://vidyamantra-congrea.firebaseio.com',
      projectId: 'vidyamantra-congrea',
      storageBucket: 'vidyamantra-congrea.appspot.com',
      messagingSenderId: '1041362522462',
      appId: '1:1041362522462:web:19396cecc1c79a6dea7fcf',
      measurementId: 'G-PDLZDWQ06W',
    };
    const result = await this.authenticate(config);
    if (result && Object.prototype.hasOwnProperty.call(result, 'operationType')) {
      this.afterSignIn();
    } else {
      console.log(`There is some error${result}`);
    }
  }

  makeReadyContext() { // main part
    if (this.clearTimeMakeReady) clearTimeout(this.clearTimeMakeReady);
    this.clearTimeMakeReady = setTimeout(() => {
      if (virtualclass.vutil.checkUserRole()) {
        this.displayContext();
      } else {
        if (!this.inputGenerating) {
          this.displayContext();
        } else {
          this.donotChangeContext = this.readyContextActual();
          console.log('====> Input is generating ', this.donotChangeContext);
        }
      }
    }, 200);
  }

  getActiveTab() {
    if (document.querySelector('#congAskQuestion.active') != null) {
      return 'question';
    } else if (document.querySelector('#virtualclassnote.active') != null) {
      return 'note';
    }
    return false;
  }

  readyContextActual() { // main part
    let contextName;
    switch (virtualclass.currApp) {
      case 'Whiteboard':
      case 'DocumentShare':
        contextName = virtualclass.gObj.currWb;
        break;
      case 'EditorRich':
        contextName = 'editor';
        break;
      case 'SharePresentation':
        contextName = null;
        if (virtualclass.sharePt.currId && virtualclass.sharePt.state) {
          contextName = `sharePt-${virtualclass.sharePt.currId}_${virtualclass.sharePt.state.indexv}_${virtualclass.sharePt.state.indexh}`;
        }
        break;
      case 'Video':
        if (virtualclass.videoUl.videoId) contextName = `video-${virtualclass.videoUl.videoId}`;
        break;
      case 'ScreenShare':
        if (virtualclass.gObj.screenShareId) contextName = virtualclass.gObj.screenShareId;
        break;
      default:
        contextName = null;
    }
    return contextName;
  }

  displayContext() { // main part
    this.rendererObj.removeWriteContainer();
    const contextName = this.readyContextActual();
    if (contextName === this.currentContext || !contextName) return;
    console.log('===> context before ', this.currentContext);
    const activeTab = this.getActiveTab();
    if (activeTab !== 'question') {
      if (this.queue.question[contextName] && this.queue.question[contextName].length > 0) {
        this.rendererObj.addHighLightNewQuestionActual();
      } else {
        this.rendererObj.removeHighlightQuestion();
      }
    }
    this.triggerPerform(contextName);
    console.log('===> context after ', this.currentContext);

    if (virtualclass.vutil.checkUserRole()) {
      ioAdapter.mustSend({ cf: 'readyContext', context: this.currentContext });
    }
  }

  triggerPerform(contextName) { // main part
    this.currentContext = contextName;
    this.triggerPerformActual(contextName);
  }

  triggerPerformActual(contextName) { // main part
    const askQuestoinContainer = document.getElementById('askQuestion');
    if (askQuestoinContainer) {
      if (!contextName) {
        askQuestoinContainer.classList.remove('readyContext');
      } else {
        askQuestoinContainer.classList.add('readyContext');
      }
    }

    const getContextElem = document.querySelector('#askQuestion .container .current');
    const contextElem = document.querySelector(`.context[data-context~=${this.currentContext}]`);
    if (contextElem && !contextElem.classList.contains('current')) {
      contextElem.classList.add('current');
    }

    if (getContextElem && getContextElem.classList.contains('current')) {
      getContextElem.classList.remove('current');
    }

    if (contextName && !this.context[contextName]) {
      this.context[contextName] = new QAcontext();
    }

    const type = this.getActiveTab();
    if (type && this.queue[type] && this.queue[type][contextName] && this.queue[type][contextName].length > 0) {
      this.engine.perform(contextName, type);
      if (type === 'note') this.note.afterChangeContext(contextName);
    } else if (type === 'note') {
      // Create blank structure for note
      this.engine.performWithQueue({ component: 'note', action: 'renderer', type: 'noteContainer', context: contextName });
      this.note.afterChangeContext(contextName);
    }
    this.bookmark.afterChangeContext(contextName);
  }

  async authenticate(config) { // main part
    firebase.initializeApp(config);
    if (!this.db) this.db = firebase.firestore();
    this.setDbCollection();
    const result = await virtualclass.xhrn.getAskQnAccess();
    if (result) return firebase.auth().signInWithCustomToken(result.data);
    // This caches the data
    this.db.firestore().enablePersistence()
      .catch(function(err) {
        if (err.code == 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled
          // in one tab at a a time.
          // ...
          console.log('====> here is some error');
        } else if (err.code == 'unimplemented') {
          // The current browser does not support all of the
          // features required to enable persistence
          // ...
          console.log('====> here is another error');
        }
      });
    return false;
  }

  setDbCollection() { // main part
    if (virtualclass.isPlayMode) {
      this.collection = `${wbUser.lkey}_${wbUser.session}_${wbUser.room}`;
      this.collectionMark = `${this.collection}_${virtualclass.gObj.orginalUserId}`;
    } else if (localStorage.getItem('mySession') != null) {
      this.collection = `${wbUser.lkey}_${localStorage.getItem('mySession')}_${wbUser.room}`;
      this.collectionMark = `${this.collection}_${virtualclass.gObj.orginalUserId}`;
    }
  }

  buildAllMarksStatus(data) { // main part
    if (!this.allMarks[data.context]) {
      this.allMarks[data.context] = {};
    }

    if (data.component === 'question') {
      if (data.action === 'create') {
        if (!this.allMarks[data.context].question) this.allMarks[data.context].question = [];
        this.allMarks[data.context][data.component].push(data.componentId);
      } else if (data.action === 'delete') {
        this.allMarks[data.context][data.component] = this.allMarks[data.context][data.component].filter(e => e !== data.componentId);
      }
    } else if (data.component === 'note') {
      this.allMarks[data.context][data.component] = true;
      if (data.content.trim() === '' || data.content.trim() === '') {
        delete this.allMarks[data.context][data.component];
      }
    } else if (data.component === 'bookmark') {
      this.allMarks[data.context][data.component] = true;
      if (+(data.content) === 0) {
        delete this.allMarks[data.context][data.component];
      }
    }
  }

  attachHandlerForRealTimeUpdate() { // main part
    console.log('===> Attach Real time update ');
    this.db.collection(this.collection).orderBy('timestamp', 'asc')
      .onSnapshot((querySnapshot) => {
        querySnapshot.docChanges().forEach((change) => {
          const askQuestion = document.getElementById('askQuestion');
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data();
            if (askQuestion.classList.contains('active') && (data.context === virtualclass.userInteractivity.currentContext || virtualclass.userInteractivity.viewAllMode)) {
              this.engine.performWithQueue(data);
              if (virtualclass.isPlayMode && data.context === '_doc_0_0') this.buildAllMarksStatus(data);
            } else {
              this.engine.makeQueue(data);
              this.rendererObj.addHighLightNewQuestion(data);
              if (virtualclass.isPlayMode) this.buildAllMarksStatus(data);
            }
          };
        });

        if (this.firstRealTime) {
          const virtualclassCont = document.getElementById('virtualclassCont');
          if (virtualclassCont) virtualclassCont.classList.remove('askQuestionFetching');
          this.firstRealTime = false;
        }
      }, (error) => {
        console.log('ask question real time ', error);
      });
  }

  afterSignIn() { // main part
    console.log('====> after sign in');
    if (this.collection) this.attachHandlerForRealTimeUpdate();
    if (virtualclass.isPlayMode) {
      virtualclass.recorder.requestListOfFiles();
      if (this.collectionMark) this.loadInitialDataMark();
    }
    // if (this.collectionMark) this.loadInitialDataMark();
  }

  loadInitialDataMark() { // part of note and book mark
    if (!this.collectionMark) return;
    if (this.initCollectionMark) return;
    console.log('===> trigger note initial data');
    const self = this;
    console.log('===> collection mark ', this.collectionMark);
    const virtualclassCont = document.getElementById('virtualclassCont');
    virtualclassCont.classList.add('readyForNote');

    this.db.collection(this.collectionMark).get().then((snapshot) => {
      // TODO, we have to store the inital data from attachHandlerForRealTimeUpdate
      self.initCollectionMark = true;
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const currentActiveTab = self.getActiveTab();
        console.log('====> total data type ', data.type);
        if ((currentActiveTab === 'note' || data.component === 'bookmark') && self.currentContext === data.context) {
          self.engine.performWithQueue(data);
        } else {
          self.engine.makeQueue(data);
        }

        if (virtualclass.isPlayMode) this.buildAllMarksStatus(data);

        if (data.component === 'note') {
          virtualclass.userInteractivity.note.queue = data.navigation;
          virtualclass.userInteractivity.note.afterChangeContext(virtualclass.userInteractivity.currentContext);
        }
      });
    });

    // .catch((error) => {
    //   console.log('ask question read error ', error);
    // });
    // todo, this has to be enable in production
  }

  async triggerInitFirebaseOperation(from) { // main part
    await this.initFirebaseOperatoin();
    if (this.initFirebase) { this.loadInitialDataMark(); }
    if (from === 'note') {
      const loadingActive = document.querySelector('#noteContainer .loading.active');
      if (loadingActive) {
        loadingActive.classList.remove('active');
      }

      const contentActive = document.querySelector('#noteContainer .contentContainer');
      if (contentActive) {
        contentActive.classList.add('active');
      }
    }
  }

  renderMainContainer(elem) { // main part
    virtualclass.rightbar.handleDisplayRightBar('#askQuestion');
    virtualclass.rightbar.handleDisplayBottomRightBar(elem);
    if (this.queue.question[this.currentContext] && this.queue.question[this.currentContext].length > 0) {
      this.engine.perform(this.currentContext, 'question');
    }
  }

  getCurrentQuestions() { // main part
    return this.context[virtualclass.userInteractivity.currentContext].question;
  }

  triggerPause() { // main part
    if (virtualclass.isPlayMode && virtualclass.recorder.playStart && !virtualclass.recorder.controller.pause) {
      virtualclass.recorder.initRecPause();
    }
  }
}
