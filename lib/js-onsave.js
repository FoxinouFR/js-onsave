'use babel';

import {existsSync, readFileSync, mkdirSync} from 'fs';
import { CompositeDisposable } from 'atom';
import {join, relative, dirname, extname, basename} from 'path';
import {exec} from 'child_process';

const CONFIGS_FILENAME = '.js-onsave.json';
const EXEC_TIMEOUT = 60 * 1000; // 1 minute

export default {
    
    //------------------------------------
    //Activation du plugin
    activate()
    {
//        console.log('js-onsave::activate()');
        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.workspace.observeTextEditors(textEditor => {
            this.subscriptions.add(textEditor.onDidSave(this.handleDidSave.bind(this)));
        }));
        //Mise sur ecoute du menu "Packages"
//        this.subscriptions.add(atom.commands.add('atom-workspace', 'js-onsave:force-compile', this.force_compile.bind(this)));
    },
    //------------------------------------
    //Desactivation du plugin
    deactivate()
    {
        //Supprimer les listeners
        this.subscriptions.dispose();
    },
    //------------------------------------
    //Evenement "onsave"
    handleDidSave(event)
    {
//		console.log('handleDidSave()');
        //Initialisations
		this.savedFilePath = null;
        this.savedFileDir = null
		this.savedFileName = null;
		this.targetDirPath = null;
        this.recompile = false;
        
//	    console.log(event.path);
//	    console.log(typeof(event.path));
		//Si le fichier n'est pas en extension js
		if(typeof(event.path) !== 'string' || extname(event.path) !== '.js')
			return null;
		//Sauvegarder le chemin du fichier
		this.savedFilePath = event.path;
		//Nom du fichier (sans .js)
		this.savedFileName = basename(event.path);
		this.savedFileName = this.savedFileName.slice(0,-3);
		//Chemin du dossier contenant le fichier
		this.savedFileDir = dirname(this.savedFilePath)+'/';
        
		//Traiter la demande
		this.run();
        //Fin du traitement
        return null;
    },
	/*
    //------------------------------------
    //Forcer la compilation manuellement
    force_compile(event)
    {
		console.log('compileFiles() force_compile!');
        console.log(event);
		//Initialisations
		this.savedFileDir = null
		this.recompile = false;
        
        //Editeur actif
		let editor = atom.workspace.getActiveTextEditor();
		if(typeof(editor) === 'undefined')
			return null;
		//Sauvegarder le chemin du fichier
		this.savedFilePath = editor.getPath();
        //Determiner le dossier de travail
		this.savedFileDir = dirname(editor.getPath())+'/';
		//Forcer la recompilation
		this.recompile = true;
		
		//Traiter la demande
		this.run();
        //Fin du traitement
        return null;
    },
	*/
    //------------------------------------
    //Fonction pour traiter l'execution de la commande
	run()
	{
//		console.log('manager::run()');
        
        //Si le chemin du fichier n'existe pas ne pas continuer
        if(typeof(this.savedFileDir) === 'undefined' || this.savedFileDir === null)
            return null;
		
		//Chercher le dossier principal
		this.rootDir = this.findConfigFile(this.savedFileDir);
		//Si le dossier du projet n'a pas ete trouvee, ne pas continuer
		if(typeof(this.rootDir) === 'undefined' || this.rootDir === null)
		{
//			console.log('unknown rootdir');
			return null;
		}
			
//		console.log('this.rootDir = ' + this.rootDir);
		
		//Lecture du fichier de configuration
		this.configs = this.readConfigFile();
		//Si il n'y a pas de configuration
		if(typeof(this.configs) === 'undefined' || this.configs === null)
		{
//			console.log('unknown configs');
			return null;
		}
		
		//Si le chemin cible ou le chemin destination n'est pas defini
		if(typeof(this.configs.inputDir) === 'undefined' || typeof(this.configs.outputDir) === 'undefined')
		{
			//Afficher un message d'erreur
			atom.notifications.addError('js-onsave: Configuration error', {detail: 'Please specify inputDir and outputDir path.', dismissable: true});
			//Stopper l'execution
			return null;
		}
		
//		console.log(this.configs);
		
		//Determiner si le dossier est a surveiller
		let dir_indexof = this.savedFileDir.lastIndexOf(this.configs.inputDir);
		//Si le fichier sauvegarde n'est pas dans le dossier a surveiller
		if(dir_indexof === -1)
		{
//			console.log('indexof() === -1');
			//Stopper l'execution
			return null;
		}
		
		//Determiner le chemin final (supprimer inputDir, ajouter outputDir)
		this.targetDirPath = this.savedFileDir.substring(dir_indexof + this.configs.inputDir.length);
//		console.log(this.targetDirPath);
		//Generer la structure des sous dossiers a creer
		this.makeDirectories();
        //Compiler le fichier avec la commande yui du package
		this.compileFile();
	},
    //------------------------------------
    //Contruction de l'arborescense des dossiers si necessaire
    makeDirectories()
    {
		//Si il n'y a pas de dossier a creer
		if(this.targetDirPath.length === 0)
			return ;
		//Chemin par defaut
		let _path = this.rootDir + this.configs.outputDir;
		//Parcourir tous les sous dossiers
		this.targetDirPath.split('/').forEach(function(_dir)
		{
			//Si le dossier a une valeur
			if(_dir.length !== 0)
			{
				_path += _dir + '/';
//				console.log(_path);
				if(existsSync(_path) !== true)
					mkdirSync(_path);
			}
		});
	},
    //------------------------------------
    //Compiler le fichier
    compileFile()
    {
		//Si on doit afficher la reussite
		if(this.configs.showStartup)
		{
			atom.notifications.addSuccess('js-onsave: Compilation started', { dismissable: false});
		}
		//Construction de la commande et des options
		let command = this.makeCommand();
		let options = {cwd: this.rootDir, timeout: EXEC_TIMEOUT};
		//Executer la commande
		exec(command, options, (err, stdout, stderr) =>
		{
			let output = stdout.trim();
			let error = stderr.trim() || (err && err.message);
			//Si on doit afficher la reussite
			if(this.configs.showOutput && error === null)
			{
				atom.notifications.addSuccess('js-onsave: Command succeeded', {detail: output, dismissable: false});
			}
			//Si on doit affficher l'erreur
			if(this.configs.showError && error)
			{
				atom.notifications.addError('js-onsave: Command failed', {detail: output, description:error, dismissable: true});
			}
		});
    },
    //------------------------------------
	//Generer la commande scss suivant la configuration
	makeCommand()
	{
		let command = configs.javaBin + ' -jar -Xss2048k';
		//Ajouter le binaire
		command += ' ' + __dirname + '/bin/yuicompressor-2.4.8.jar';
		//Fichier de sortie
		command += ' --type js -o ' + this.rootDir + this.configs.outputDir + this.targetDirPath + configs.outputFilename.replace('$1', this.savedFileName);
		//Fichier d'entree
		command += ' ' + this.savedFilePath;
		
//		console.log(command);
		//Retourner la commande complete
		return command;
	},
    //------------------------------------
	//Lire le fichier de configuration
	readConfigFile()
	{
	    let file_path = join(this.rootDir, CONFIGS_FILENAME);
		//Recuperer le contenu du fichier
	    let file_content = readFileSync(file_path, 'utf8');
	    //Parser le JSON
		configs = JSON.parse(file_content);
		//Ajouter les elements n'existant pas avec une valeur par defaut
		configs.showStartup	= typeof(configs.showStartup) === 'undefined' ? false : configs.showStartup;
		configs.showOutput	= typeof(configs.showOutput) === 'undefined' ? false : configs.showOutput;
		configs.showError	= typeof(configs.showError) === 'undefined' ? true : configs.showError;
		configs.javaBin		= typeof(configs.javaBin) === 'undefined' ? 'java' : configs.javaBin;
		configs.outputFilename	= typeof(configs.outputFilename) === 'undefined' ? '$1.min.js' : configs.outputFilename;
		//Ajouter le slash de fin si necessaire
		configs.inputDir += configs.inputDir.slice(-1) !== '/' ? '/' : '';
		configs.outputDir += configs.outputDir.slice(-1) !== '/' ? '/' : '';
		//Retourner le tableau de configuration
		return configs;
	},
    //------------------------------------
	//Trouver le fichier de configuration (recursion)
	findConfigFile(dir)
	{
//		console.log('dir = ' + dir);
		//Si le fichier de configuration existe, retourner le chemin
		if(existsSync(join(dir, CONFIGS_FILENAME)))
			return dir+'/';
		//Chercher un parent
		let parentDir = join(dir, '..');
		//Si il n'y a pas de parent, arreter
		if(parentDir === dir)
			return undefined;
		//Passer au parent precedent
		return this.findConfigFile(parentDir);
	},
};
